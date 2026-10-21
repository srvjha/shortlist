import { and, count, eq, gt, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { aiRuns, resumes, users } from "../../db/schema/index.js";
import { AppError, NotFoundError } from "../../lib/errors.js";
import { hasUserAiKey } from "../ai-keys/ai-keys.service.js";

export type Plan = (typeof users.$inferSelect)["plan"];
export type QuotaKind = "tailor" | "edit" | "import" | "draft" | "job" | "ats";

// Monthly AI limits per plan; resumes are unlimited on every plan (1000 = unlimited). Paid limits are fair-use caps.
// Imports are free on every plan; the cap only stops abuse. Job descriptions are parsed once per posting, then reused.
// Free gets one resume written from notes per account (counted for all time), to see it work once.
// ATS checks with a job description have their own cap, so they never use up the AI edits people see.
export const planLimits: Record<Plan, Record<QuotaKind | "resumes", number>> = {
  free: { resumes: 1000, tailor: 1, edit: 50, import: 20, draft: 1, job: 10, ats: 20 },
  season_pass: { resumes: 1000, tailor: 40, edit: 1000, import: 20, draft: 30, job: 100, ats: 200 },
  pro: { resumes: 1000, tailor: 60, edit: 1000, import: 20, draft: 30, job: 100, ats: 200 },
};

const stepsFor: Record<QuotaKind, (typeof aiRuns.$inferSelect)["step"][]> = {
  tailor: ["rewrite"],
  edit: ["chat_edit", "inline_edit", "fix_compile"],
  import: ["import"],
  draft: ["draft"],
  job: ["jd_parse"],
  ats: ["ats_match"],
};

// Calendar month in UTC.
export function periodStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function periodEnd(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

type Executor = Pick<typeof db, "select">;
type Step = (typeof aiRuns.$inferInsert)["step"];

// A reserved run whose request crashed before recording a result stops counting after this long.
const PENDING_TTL = sql`now() - interval '10 minutes'`;

async function planOf(userId: string, executor: Executor = db): Promise<Plan> {
  const [user] = await executor.select({ plan: users.plan }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new NotFoundError("User");
  return user.plan;
}

// `allTime` counts every run, for allowances given once per account rather than per month.
async function usedThisPeriod(userId: string, kind: QuotaKind, allTime = false, executor: Executor = db) {
  const [user] = await executor.select({ resetAt: users.usageResetAt }).from(users).where(eq(users.id, userId));
  const start = allTime ? new Date(0) : periodStart();
  const since = user?.resetAt && user.resetAt > start ? user.resetAt : start;
  return runsSince(userId, kind, since, executor);
}

// Charged runs of one kind since a moment, counted the way quotas count them.
export async function runsSince(userId: string, kind: QuotaKind, since: Date, executor: Executor = db) {
  const [row] = await executor
    .select({ value: count() })
    .from(aiRuns)
    .where(
      and(
        eq(aiRuns.userId, userId),
        // A run still waiting on the model counts, so parallel requests can't all slip under the limit.
        or(eq(aiRuns.status, "succeeded"), and(eq(aiRuns.status, "pending"), gt(aiRuns.createdAt, PENDING_TTL))),
        eq(aiRuns.byok, false),
        inArray(aiRuns.step, stepsFor[kind]),
        gte(aiRuns.createdAt, since),
        // A suggestion with no changes gave the user nothing to apply, so it isn't charged.
        sql`coalesce(jsonb_array_length(${aiRuns.patchOps}->'operations'), 1) > 0`,
      ),
    );
  return row?.value ?? 0;
}

async function activeResumes(userId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(resumes)
    .where(and(eq(resumes.userId, userId), isNull(resumes.deletedAt)));
  return row?.value ?? 0;
}

function quotaError(message: string, limit: number, used: number, resetsAt?: Date) {
  return new AppError(402, "QUOTA_EXCEEDED", message, { limit, used, ...(resetsAt && { resetsAt }) });
}

export async function assertAiQuota(userId: string, kind: QuotaKind) {
  // Requests on the user's own key cost us nothing, so plan limits don't apply.
  if (await hasUserAiKey(userId)) return;
  await checkQuota(userId, kind);
}

// Checks the quota and records a pending run in one step, under a per-user lock: a parallel request waits, then
// counts this run. The early assertAiQuota only fails fast; this is the check that holds.
export async function reserveAiRun(userId: string, kind: QuotaKind, step: Step) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`ai-quota:${userId}`}))`);
    await tx
      .update(aiRuns)
      .set({ status: "failed", error: "abandoned before the model answered" })
      .where(and(eq(aiRuns.userId, userId), eq(aiRuns.status, "pending"), lt(aiRuns.createdAt, PENDING_TTL)));
    await checkQuota(userId, kind, tx);
    const [run] = await tx
      .insert(aiRuns)
      .values({ userId, step, status: "pending", model: "pending" })
      .returning({ id: aiRuns.id });
    return run!.id;
  });
}

async function checkQuota(userId: string, kind: QuotaKind, executor: Executor = db) {
  const plan = await planOf(userId, executor);
  const limit = planLimits[plan][kind];
  const once = kind === "draft" && plan === "free";
  const used = await usedThisPeriod(userId, kind, once, executor);
  if (used >= limit && once) {
    throw quotaError(
      "You've used your free AI-written resume. Season Pass and Pro include more, or add your own AI key.",
      limit,
      used,
    );
  }
  if (used >= limit) {
    throw quotaError(`You've used all ${limit} ${kind} requests for this month`, limit, used, periodEnd());
  }
}

// Premium features (extra link controls, detailed analytics) need Season Pass or Pro.
export async function assertPaidPlan(userId: string, feature: string) {
  if ((await planOf(userId)) === "free")
    throw new AppError(402, "PLAN_REQUIRED", `${feature} is part of Season Pass and Pro`);
}

export async function assertResumeQuota(userId: string) {
  const limit = planLimits[await planOf(userId)].resumes;
  const used = await activeResumes(userId);
  if (used >= limit)
    throw quotaError(`You've reached the limit of ${limit} resumes. Delete some you no longer need.`, limit, used);
}

export async function getUsage(userId: string) {
  const plan = await planOf(userId);
  const limits = planLimits[plan];
  const [tailor, edit, importCount, draft, resumeCount, ownAiKey] = await Promise.all([
    usedThisPeriod(userId, "tailor"),
    usedThisPeriod(userId, "edit"),
    usedThisPeriod(userId, "import"),
    usedThisPeriod(userId, "draft", plan === "free"),
    activeResumes(userId),
    hasUserAiKey(userId),
  ]);
  return {
    plan,
    ownAiKey,
    periodStart: periodStart(),
    periodEnd: periodEnd(),
    resumes: { used: resumeCount, limit: limits.resumes },
    tailor: { used: tailor, limit: limits.tailor },
    edit: { used: edit, limit: limits.edit },
    import: { used: importCount, limit: limits.import },
    draft: { used: draft, limit: limits.draft },
  };
}
