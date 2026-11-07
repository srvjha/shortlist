import { and, count, eq, gt, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { aiRuns, pdfDownloads, resumes, users } from "../../db/schema/index.js";
import { AppError, NotFoundError } from "../../lib/errors.js";
import { hasUserAiKey } from "../ai-keys/ai-keys.service.js";

export type Plan = (typeof users.$inferSelect)["plan"];
export type QuotaKind = "tailor" | "edit" | "fix" | "import" | "draft" | "job" | "ats" | "review" | "letter";

// Monthly AI limits per plan (1000 resumes = unlimited; paid limits are fair-use caps). On Free, the kinds in
// `onceOnFree` count for all time instead of per month: enough to see each feature work once.
// Fixing LaTeX that won't compile has its own cap, so a broken resume can't leave someone stuck with no edit left.
// Imports only have a cap to stop abuse. Job descriptions are parsed once per posting, then reused.
// ATS checks with a job description have their own cap, so they never use up the AI edits people see.
// The AI resume review is paid only; free is 0 and is turned away by assertPaidPlan before the quota.
const paid = { resumes: 1000, edit: 1000, fix: 200, import: 20, draft: 30, job: 100, ats: 200, review: 100 };
export const planLimits: Record<Plan, Record<Exclude<QuotaKind, "letter"> | "resumes", number>> = {
  free: { resumes: 1, tailor: 1, edit: 1, fix: 5, import: 20, draft: 1, job: 10, ats: 20, review: 0 },
  season_pass: { ...paid, tailor: 40 },
  pro: { ...paid, tailor: 60 },
  lifetime: { ...paid, tailor: 60 },
};

// AI cover letters are free on every plan, so this fair-use cap is the same for all of them.
const LETTER_LIMIT = 30;

const onceOnFree: readonly QuotaKind[] = ["tailor", "edit", "draft"];
const countsForAllTime = (plan: Plan, kind: QuotaKind) => plan === "free" && onceOnFree.includes(kind);

// PDF downloads on Free, for all time. Paid plans aren't counted at all.
export const FREE_PDF_DOWNLOADS = 5;

const stepsFor: Record<QuotaKind, (typeof aiRuns.$inferSelect)["step"][]> = {
  tailor: ["rewrite"],
  edit: ["chat_edit", "inline_edit", "project_link"],
  fix: ["fix_compile"],
  import: ["import"],
  draft: ["draft"],
  job: ["jd_parse"],
  ats: ["ats_match"],
  review: ["ats_review"],
  letter: ["cover_letter"],
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

const freeLimitMessages: Partial<Record<QuotaKind, string>> = {
  tailor: "You've used your free tailored resume. Basic includes 60 a month, or add your own AI key.",
  edit: "You've used your free AI edit. Basic includes unlimited AI edits, or add your own AI key.",
  draft: "You've used your free AI-written resume. Basic includes 30 a month, or add your own AI key.",
};

async function checkQuota(userId: string, kind: QuotaKind, executor: Executor = db) {
  const plan = await planOf(userId, executor);
  const limit = kind === "letter" ? LETTER_LIMIT : planLimits[plan][kind];
  const allTime = countsForAllTime(plan, kind);
  const used = await usedThisPeriod(userId, kind, allTime, executor);
  if (used < limit) return;
  if (allTime) throw quotaError(freeLimitMessages[kind]!, limit, used);
  const what = kind === "letter" ? "AI cover letters" : `${kind} requests`;
  throw quotaError(`You've used all ${limit} ${what} for this month`, limit, used, periodEnd());
}

// Premium features (extra link controls, detailed analytics) need a paid plan.
export async function assertPaidPlan(userId: string, feature: string) {
  if ((await planOf(userId)) === "free")
    throw new AppError(402, "PLAN_REQUIRED", `${feature} is part of Basic and Pro`);
}

export async function assertResumeQuota(userId: string) {
  const limit = planLimits[await planOf(userId)].resumes;
  const used = await activeResumes(userId);
  if (used >= limit)
    throw quotaError(
      limit === 1
        ? "The Free plan includes 1 resume, and you can keep editing yours. Basic includes unlimited resumes."
        : `You've reached the limit of ${limit} resumes. Delete some you no longer need.`,
      limit,
      used,
    );
}

// Counts a Free account's download of one version once, under the same per-user lock as the AI quotas, so parallel
// requests can't slip past the limit. Downloading the same version again is free.
export async function recordPdfDownload(userId: string, versionId: string) {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`pdf-quota:${userId}`}))`);
    if ((await planOf(userId, tx)) !== "free") return;
    const counted = eq(pdfDownloads.userId, userId);
    const [seen] = await tx
      .select({ versionId: pdfDownloads.versionId })
      .from(pdfDownloads)
      .where(and(counted, eq(pdfDownloads.versionId, versionId)))
      .limit(1);
    if (seen) return;
    const [row] = await tx.select({ value: count() }).from(pdfDownloads).where(counted);
    const used = row?.value ?? 0;
    if (used >= FREE_PDF_DOWNLOADS) {
      throw quotaError(
        `You've used your ${FREE_PDF_DOWNLOADS} free PDF downloads. Basic and Pro include unlimited downloads.`,
        FREE_PDF_DOWNLOADS,
        used,
      );
    }
    await tx.insert(pdfDownloads).values({ userId, versionId });
  });
}

export async function getUsage(userId: string) {
  const plan = await planOf(userId);
  const limits = planLimits[plan];
  const [tailor, edit, importCount, draft, resumeCount, ownAiKey, pdf] = await Promise.all([
    usedThisPeriod(userId, "tailor", countsForAllTime(plan, "tailor")),
    usedThisPeriod(userId, "edit", countsForAllTime(plan, "edit")),
    usedThisPeriod(userId, "import"),
    usedThisPeriod(userId, "draft", countsForAllTime(plan, "draft")),
    activeResumes(userId),
    hasUserAiKey(userId),
    db.select({ value: count() }).from(pdfDownloads).where(eq(pdfDownloads.userId, userId)),
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
    pdf: plan === "free" ? { used: pdf[0]?.value ?? 0, limit: FREE_PDF_DOWNLOADS } : null,
  };
}
