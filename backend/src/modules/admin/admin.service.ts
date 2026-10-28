import { and, asc, count, countDistinct, desc, eq, gte, ilike, isNotNull, isNull, or, sql, sum } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { env } from "../../config/env.js";
import { db, pool } from "../../db/index.js";
import {
  accounts,
  aiRuns,
  customTemplates,
  jobs,
  linkViews,
  payments,
  resumes,
  resumeVersions,
  sessions,
  shareLinks,
  subscriptions,
  uploads,
  users,
  webhookEvents,
} from "../../db/schema/index.js";
import { hideKeys, track } from "../../lib/analytics.js";
import { ConflictError, NotFoundError } from "../../lib/errors.js";
import { storage } from "../../lib/storage.js";
import { dayKeys } from "../analytics/analytics.service.js";
import { grantPlan, recomputePlan } from "../billing/billing.service.js";
import { getUsage } from "../usage/quotas.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function range(days: number) {
  const now = new Date();
  const since = new Date(now.getTime() - days * DAY_MS);
  return { now, since, previousSince: new Date(since.getTime() - days * DAY_MS) };
}

const filtered = (condition: ReturnType<typeof sql>) =>
  sql<number>`count(*) filter (where ${condition})`.mapWith(Number);
const dayOf = (column: PgColumn, timeZone: string) =>
  sql<string>`to_char(${column} at time zone ${timeZone}, 'YYYY-MM-DD')`;

// Fills days without rows with zero so charts show gaps honestly.
function fillDays<K extends string>(
  keys: string[],
  rows: ({ day: string } & Record<K, number>)[],
  fields: K[],
): ({ day: string } & Record<K, number>)[] {
  const byDay = new Map(rows.map((row) => [row.day, row]));
  return keys.map((day) => {
    const row = byDay.get(day);
    return { day, ...Object.fromEntries(fields.map((field) => [field, row ? Number(row[field]) : 0])) } as {
      day: string;
    } & Record<K, number>;
  });
}

// Drizzle leaves columns unqualified in a select without joins, so inside a correlated subquery a bare
// "id" binds to the inner table. The outer row's column is always named in full.
const outer = (table: string, column: string) => sql.raw(`"${table}"."${column}"`);

const providersOf = sql<
  string[]
>`coalesce((select array_agg(distinct ${accounts.providerId}) from ${accounts} where ${accounts.userId} = ${outer("users", "id")}), '{}')`;
const lastActiveOf = sql<Date | null>`(select max(${sessions.updatedAt}) from ${sessions} where ${sessions.userId} = ${outer("users", "id")})`;

export async function getOverview(days: number, timeZone: string) {
  const { now, since, previousSince } = range(days);
  const current = (column: PgColumn) => sql`${column} >= ${since}`;
  const previous = (column: PgColumn) => sql`${column} >= ${previousSince} and ${column} < ${since}`;

  const [
    [userTotals],
    [active],
    [resumeTotals],
    [ai],
    [revenue],
    [views],
    signups,
    resumesByDay,
    aiByDay,
    viewsByDay,
    plans,
    providers,
    [funnel],
    recentSignups,
  ] = await Promise.all([
    db
      .select({
        users: filtered(sql`not ${users.isAnonymous}`),
        guests: filtered(sql`${users.isAnonymous}`),
        newUsers: filtered(sql`not ${users.isAnonymous} and ${current(users.createdAt)}`),
        previousNewUsers: filtered(sql`not ${users.isAnonymous} and ${previous(users.createdAt)}`),
        paid: filtered(sql`${users.plan} <> 'free'`),
        suspended: filtered(sql`${users.suspendedAt} is not null`),
      })
      .from(users),
    db
      .select({
        users: sql<number>`count(distinct ${sessions.userId}) filter (where ${current(sessions.updatedAt)})`.mapWith(
          Number,
        ),
        previousUsers:
          sql<number>`count(distinct ${sessions.userId}) filter (where ${previous(sessions.updatedAt)})`.mapWith(
            Number,
          ),
      })
      .from(sessions)
      .innerJoin(users, and(eq(users.id, sessions.userId), eq(users.isAnonymous, false))),
    db
      .select({
        total: filtered(sql`${resumes.deletedAt} is null`),
        created: filtered(current(resumes.createdAt)),
        previousCreated: filtered(previous(resumes.createdAt)),
      })
      .from(resumes),
    db
      .select({
        runs: filtered(current(aiRuns.createdAt)),
        previousRuns: filtered(previous(aiRuns.createdAt)),
        failed: filtered(sql`${current(aiRuns.createdAt)} and ${aiRuns.status} = 'failed'`),
        costUsdMicros:
          sql<number>`coalesce(sum(${aiRuns.costUsdMicros}) filter (where ${current(aiRuns.createdAt)}), 0)`.mapWith(
            Number,
          ),
        previousCostUsdMicros:
          sql<number>`coalesce(sum(${aiRuns.costUsdMicros}) filter (where ${previous(aiRuns.createdAt)}), 0)`.mapWith(
            Number,
          ),
      })
      .from(aiRuns),
    db
      .select({
        paise: sql<number>`coalesce(sum(${payments.amount}) filter (where ${current(payments.updatedAt)}), 0)`.mapWith(
          Number,
        ),
        previousPaise:
          sql<number>`coalesce(sum(${payments.amount}) filter (where ${previous(payments.updatedAt)}), 0)`.mapWith(
            Number,
          ),
      })
      .from(payments)
      // Rupees only; dollars from Polar show on the revenue page.
      .where(and(eq(payments.status, "captured"), eq(payments.currency, "INR"))),
    db
      .select({ views: filtered(current(linkViews.viewedAt)), previousViews: filtered(previous(linkViews.viewedAt)) })
      .from(linkViews),
    db
      .select({ day: dayOf(users.createdAt, timeZone), count: count() })
      .from(users)
      .where(and(gte(users.createdAt, since), eq(users.isAnonymous, false)))
      .groupBy(sql`1`),
    db
      .select({ day: dayOf(resumes.createdAt, timeZone), count: count() })
      .from(resumes)
      .where(gte(resumes.createdAt, since))
      .groupBy(sql`1`),
    db
      .select({ day: dayOf(aiRuns.createdAt, timeZone), count: count() })
      .from(aiRuns)
      .where(gte(aiRuns.createdAt, since))
      .groupBy(sql`1`),
    db
      .select({ day: dayOf(linkViews.viewedAt, timeZone), count: count() })
      .from(linkViews)
      .where(gte(linkViews.viewedAt, since))
      .groupBy(sql`1`),
    db
      .select({ label: users.plan, count: count() })
      .from(users)
      .where(eq(users.isAnonymous, false))
      .groupBy(users.plan)
      .orderBy(desc(count())),
    db
      .select({ label: accounts.providerId, count: countDistinct(accounts.userId) })
      .from(accounts)
      .innerJoin(users, and(eq(users.id, accounts.userId), eq(users.isAnonymous, false)))
      .groupBy(accounts.providerId)
      .orderBy(desc(countDistinct(accounts.userId))),
    // Of the people who signed up in the range, how many reached each step.
    db
      .select({
        signedUp: count(),
        createdResume: filtered(
          sql`exists (select 1 from ${resumes} where ${resumes.userId} = ${outer("users", "id")})`,
        ),
        usedAi: filtered(sql`exists (select 1 from ${aiRuns} where ${aiRuns.userId} = ${outer("users", "id")})`),
        shared: filtered(
          sql`exists (select 1 from ${shareLinks} where ${shareLinks.userId} = ${outer("users", "id")})`,
        ),
        paid: filtered(
          sql`exists (select 1 from ${payments} where ${payments.userId} = ${outer("users", "id")} and ${payments.status} = 'captured')`,
        ),
      })
      .from(users)
      .where(and(gte(users.createdAt, since), eq(users.isAnonymous, false))),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        plan: users.plan,
        createdAt: users.createdAt,
        providers: providersOf,
      })
      .from(users)
      .where(eq(users.isAnonymous, false))
      .orderBy(desc(users.createdAt))
      .limit(8),
  ]);

  const keys = dayKeys(days, timeZone, now);
  const merged = new Map<string, { signups: number; resumes: number; aiRuns: number; views: number }>();
  for (const key of keys) merged.set(key, { signups: 0, resumes: 0, aiRuns: 0, views: 0 });
  for (const [rows, field] of [
    [signups, "signups"],
    [resumesByDay, "resumes"],
    [aiByDay, "aiRuns"],
    [viewsByDay, "views"],
  ] as const) {
    for (const row of rows) {
      const entry = merged.get(row.day);
      if (entry) entry[field] = row.count;
    }
  }

  return {
    days,
    totals: {
      users: userTotals?.users ?? 0,
      guests: userTotals?.guests ?? 0,
      newUsers: userTotals?.newUsers ?? 0,
      previousNewUsers: userTotals?.previousNewUsers ?? 0,
      activeUsers: active?.users ?? 0,
      previousActiveUsers: active?.previousUsers ?? 0,
      paidUsers: userTotals?.paid ?? 0,
      suspendedUsers: userTotals?.suspended ?? 0,
      resumes: resumeTotals?.total ?? 0,
      resumesCreated: resumeTotals?.created ?? 0,
      previousResumesCreated: resumeTotals?.previousCreated ?? 0,
      aiRuns: ai?.runs ?? 0,
      previousAiRuns: ai?.previousRuns ?? 0,
      aiFailed: ai?.failed ?? 0,
      aiCostUsdMicros: ai?.costUsdMicros ?? 0,
      previousAiCostUsdMicros: ai?.previousCostUsdMicros ?? 0,
      revenuePaise: revenue?.paise ?? 0,
      previousRevenuePaise: revenue?.previousPaise ?? 0,
      shareViews: views?.views ?? 0,
      previousShareViews: views?.previousViews ?? 0,
    },
    byDay: keys.map((day) => ({ day, ...merged.get(day)! })),
    plans,
    providers,
    funnel: funnel ?? { signedUp: 0, createdResume: 0, usedAi: 0, shared: 0, paid: 0 },
    recentSignups,
  };
}

const PAGE_SIZE = 25;

export async function listUsers(query: {
  q?: string | undefined;
  plan?: "free" | "season_pass" | "pro" | undefined;
  status?: "active" | "suspended" | "guest" | undefined;
  page: number;
}) {
  const search = query.q ? `%${query.q.replace(/[%_\\]/g, "\\$&")}%` : null;
  const where = and(
    search ? or(ilike(users.name, search), ilike(users.email, search), ilike(users.username, search)) : undefined,
    query.plan ? eq(users.plan, query.plan) : undefined,
    query.status === "suspended" ? isNotNull(users.suspendedAt) : undefined,
    query.status === "guest" ? eq(users.isAnonymous, true) : eq(users.isAnonymous, false),
    query.status === "active" ? isNull(users.suspendedAt) : undefined,
  );

  const [[total], rows] = await Promise.all([
    db.select({ count: count() }).from(users).where(where),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        username: users.username,
        plan: users.plan,
        isAnonymous: users.isAnonymous,
        suspendedAt: users.suspendedAt,
        createdAt: users.createdAt,
        lastActiveAt: lastActiveOf,
        providers: providersOf,
        resumes:
          sql<number>`(select count(*) from ${resumes} where ${resumes.userId} = ${outer("users", "id")} and ${resumes.deletedAt} is null)`.mapWith(
            Number,
          ),
        aiRuns: sql<number>`(select count(*) from ${aiRuns} where ${aiRuns.userId} = ${outer("users", "id")})`.mapWith(
          Number,
        ),
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(PAGE_SIZE)
      .offset((query.page - 1) * PAGE_SIZE),
  ]);

  return {
    users: rows.map((row) => ({ ...row, lastActiveAt: row.lastActiveAt ? new Date(row.lastActiveAt) : null })),
    page: query.page,
    pageSize: PAGE_SIZE,
    total: total?.count ?? 0,
  };
}

export async function getUser(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
      image: users.image,
      username: users.username,
      plan: users.plan,
      isAnonymous: users.isAnonymous,
      suspendedAt: users.suspendedAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId));
  if (!user) throw new NotFoundError("User");

  const [
    linkedAccounts,
    userResumes,
    aiByStep,
    [aiTotals],
    userSubscriptions,
    userPayments,
    userSessions,
    [sharing],
    [jobCount],
    usage,
  ] = await Promise.all([
    db
      .select({ providerId: accounts.providerId, createdAt: accounts.createdAt })
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .orderBy(asc(accounts.createdAt)),
    db
      .select({
        id: resumes.id,
        title: resumes.title,
        mode: resumes.mode,
        templateId: resumes.templateId,
        createdAt: resumes.createdAt,
        updatedAt: resumes.updatedAt,
        archivedAt: resumes.archivedAt,
        deletedAt: resumes.deletedAt,
        versions:
          sql<number>`(select count(*) from ${resumeVersions} where ${resumeVersions.resumeId} = ${outer("resumes", "id")})`.mapWith(
            Number,
          ),
      })
      .from(resumes)
      .where(eq(resumes.userId, userId))
      .orderBy(desc(resumes.updatedAt)),
    db
      .select({
        step: aiRuns.step,
        runs: count(),
        failed: filtered(sql`${aiRuns.status} = 'failed'`),
        lastError: sql<
          string | null
        >`(array_agg(${aiRuns.error} order by ${aiRuns.createdAt} desc) filter (where ${aiRuns.status} = 'failed'))[1]`,
        costUsdMicros: sql<number>`coalesce(sum(${aiRuns.costUsdMicros}), 0)`.mapWith(Number),
      })
      .from(aiRuns)
      .where(eq(aiRuns.userId, userId))
      .groupBy(aiRuns.step)
      .orderBy(desc(count())),
    db
      .select({
        runs: count(),
        byok: filtered(sql`${aiRuns.byok}`),
        costUsdMicros: sql<number>`coalesce(sum(${aiRuns.costUsdMicros}), 0)`.mapWith(Number),
        lastRunAt: sql<Date | null>`max(${aiRuns.createdAt})`,
      })
      .from(aiRuns)
      .where(eq(aiRuns.userId, userId)),
    db
      .select({
        id: subscriptions.id,
        plan: subscriptions.plan,
        status: subscriptions.status,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        providerSubscriptionId: subscriptions.providerSubscriptionId,
        payments:
          sql<number>`(select count(*) from ${payments} where ${payments.subscriptionId} = ${outer("subscriptions", "id")})`.mapWith(
            Number,
          ),
        createdAt: subscriptions.createdAt,
      })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt)),
    db
      .select({
        id: payments.id,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        method: payments.method,
        provider: payments.provider,
        providerPaymentId: payments.providerPaymentId,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt)),
    db
      .select({
        id: sessions.id,
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
        expiresAt: sessions.expiresAt,
        userAgent: sessions.userAgent,
      })
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.updatedAt))
      .limit(10),
    db
      .select({ links: count(), views: sql<number>`coalesce(sum(${shareLinks.viewCount}), 0)`.mapWith(Number) })
      .from(shareLinks)
      .where(and(eq(shareLinks.userId, userId), isNull(shareLinks.deletedAt))),
    db.select({ count: count() }).from(jobs).where(eq(jobs.userId, userId)),
    getUsage(userId),
  ]);

  return {
    user,
    accounts: linkedAccounts,
    resumes: userResumes,
    ai: {
      runs: aiTotals?.runs ?? 0,
      byokRuns: aiTotals?.byok ?? 0,
      costUsdMicros: aiTotals?.costUsdMicros ?? 0,
      lastRunAt: aiTotals?.lastRunAt ? new Date(aiTotals.lastRunAt) : null,
      bySteps: aiByStep.map((row) => ({ ...row, lastError: hideKeys(row.lastError) })),
    },
    usage,
    subscriptions: userSubscriptions.map(({ payments: paymentCount, ...subscription }) => ({
      ...subscription,
      // Given from the admin dashboard, with no payment provider billing behind it; only these can be revoked here.
      complimentary: !subscription.providerSubscriptionId && paymentCount === 0,
    })),
    payments: userPayments,
    sessions: userSessions,
    shareLinks: sharing?.links ?? 0,
    shareViews: sharing?.views ?? 0,
    jobs: jobCount?.count ?? 0,
  };
}

export async function setSuspended(adminId: string, userId: string, suspended: boolean) {
  if (adminId === userId) throw new ConflictError("You can't suspend your own account");
  const [user] = await db
    .update(users)
    .set({ suspendedAt: suspended ? new Date() : null })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  if (!user) throw new NotFoundError("User");
  if (suspended) await db.delete(sessions).where(eq(sessions.userId, userId));
  track(adminId, suspended ? "admin_user_suspended" : "admin_user_unsuspended", { target_user_id: userId });
}

export async function revokeSessions(adminId: string, userId: string) {
  const revoked = await db.delete(sessions).where(eq(sessions.userId, userId)).returning({ id: sessions.id });
  track(adminId, "admin_sessions_revoked", { target_user_id: userId, sessions: revoked.length });
}

export async function resetUsage(adminId: string, userId: string) {
  const [user] = await db
    .update(users)
    .set({ usageResetAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  if (!user) throw new NotFoundError("User");
  track(adminId, "admin_usage_reset", { target_user_id: userId });
}

export async function grantSubscription(adminId: string, userId: string, plan: "season_pass" | "pro", months: number) {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
  if (!user) throw new NotFoundError("User");
  await grantPlan(userId, plan, months);
  await recomputePlan(userId);
  track(adminId, "admin_plan_granted", { target_user_id: userId, plan, months });
}

export async function revokeSubscription(adminId: string, userId: string, subscriptionId: string) {
  const [subscription] = await db
    .select({ providerSubscriptionId: subscriptions.providerSubscriptionId })
    .from(subscriptions)
    .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.userId, userId)));
  if (!subscription) throw new NotFoundError("Subscription");
  const [paid] = await db.select({ count: count() }).from(payments).where(eq(payments.subscriptionId, subscriptionId));
  // Ending a paid plan here would leave the provider billing the user; refunds and cancellations go through it.
  if (subscription.providerSubscriptionId || (paid?.count ?? 0) > 0)
    throw new ConflictError("Paid plans are cancelled or refunded at the payment provider, not here");
  await db
    .update(subscriptions)
    .set({ status: "expired", currentPeriodEnd: new Date() })
    .where(eq(subscriptions.id, subscriptionId));
  await recomputePlan(userId);
  track(adminId, "admin_plan_revoked", { target_user_id: userId });
}

export async function getAiUsage(days: number, timeZone: string) {
  const { now, since } = range(days);
  const inRange = gte(aiRuns.createdAt, since);
  const cost = sql<number>`coalesce(sum(${aiRuns.costUsdMicros}), 0)`.mapWith(Number);

  // Runs on our key that failed since the last one that worked: one bad key or an empty balance fails them all.
  const ours = and(eq(aiRuns.byok, false), eq(aiRuns.status, "succeeded"));
  const sinceLastSuccess = sql`${aiRuns.createdAt} > coalesce((select max(${aiRuns.createdAt}) from ${aiRuns} where ${ours}), '-infinity')`;

  const [[totals], bySteps, byModels, byDay, failures, topUsers, [lastSuccess], [failing]] = await Promise.all([
    db
      .select({
        runs: count(),
        failed: filtered(sql`${aiRuns.status} = 'failed'`),
        byok: filtered(sql`${aiRuns.byok}`),
        costUsdMicros: cost,
        inputTokens: sql<number>`coalesce(sum(${aiRuns.inputTokens}), 0)`.mapWith(Number),
        cachedInputTokens: sql<number>`coalesce(sum(${aiRuns.cachedInputTokens}), 0)`.mapWith(Number),
        outputTokens: sql<number>`coalesce(sum(${aiRuns.outputTokens}), 0)`.mapWith(Number),
        users: countDistinct(aiRuns.userId),
      })
      .from(aiRuns)
      .where(inRange),
    db
      .select({
        step: aiRuns.step,
        runs: count(),
        failed: filtered(sql`${aiRuns.status} = 'failed'`),
        costUsdMicros: cost,
        p50Ms: sql<number>`coalesce(percentile_cont(0.5) within group (order by ${aiRuns.latencyMs}), 0)`.mapWith(
          Number,
        ),
        p95Ms: sql<number>`coalesce(percentile_cont(0.95) within group (order by ${aiRuns.latencyMs}), 0)`.mapWith(
          Number,
        ),
      })
      .from(aiRuns)
      .where(inRange)
      .groupBy(aiRuns.step)
      .orderBy(desc(count())),
    db
      .select({
        model: aiRuns.model,
        runs: count(),
        costUsdMicros: cost,
        tokens: sql<number>`coalesce(sum(${aiRuns.inputTokens} + ${aiRuns.outputTokens}), 0)`.mapWith(Number),
      })
      .from(aiRuns)
      .where(inRange)
      .groupBy(aiRuns.model)
      .orderBy(desc(cost)),
    db
      .select({ day: dayOf(aiRuns.createdAt, timeZone), runs: count(), costUsdMicros: cost })
      .from(aiRuns)
      .where(inRange)
      .groupBy(sql`1`),
    db
      .select({
        id: aiRuns.id,
        createdAt: aiRuns.createdAt,
        step: aiRuns.step,
        model: aiRuns.model,
        error: aiRuns.error,
        userId: users.id,
        email: users.email,
      })
      .from(aiRuns)
      .innerJoin(users, eq(users.id, aiRuns.userId))
      .where(and(inRange, eq(aiRuns.status, "failed")))
      .orderBy(desc(aiRuns.createdAt))
      .limit(20),
    db
      .select({ userId: users.id, email: users.email, name: users.name, runs: count(), costUsdMicros: cost })
      .from(aiRuns)
      .innerJoin(users, eq(users.id, aiRuns.userId))
      .where(inRange)
      .groupBy(users.id)
      .orderBy(desc(cost))
      .limit(10),
    db
      .select({ at: sql<Date | null>`max(${aiRuns.createdAt})` })
      .from(aiRuns)
      .where(ours),
    db
      .select({
        runs: count(),
        users: countDistinct(aiRuns.userId),
        since: sql<Date | null>`min(${aiRuns.createdAt})`,
        lastError: sql<string | null>`(array_agg(${aiRuns.error} order by ${aiRuns.createdAt} desc))[1]`,
      })
      .from(aiRuns)
      .where(and(eq(aiRuns.byok, false), eq(aiRuns.status, "failed"), sinceLastSuccess)),
  ]);

  return {
    days,
    totals: totals ?? {
      runs: 0,
      failed: 0,
      byok: 0,
      costUsdMicros: 0,
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      users: 0,
    },
    bySteps: bySteps.map((row) => ({ ...row, p50Ms: Math.round(row.p50Ms), p95Ms: Math.round(row.p95Ms) })),
    byModels,
    byDay: fillDays(dayKeys(days, timeZone, now), byDay, ["runs", "costUsdMicros"]),
    failures: failures.map((failure) => ({ ...failure, error: hideKeys(failure.error) })),
    topUsers,
    health: {
      lastSuccessAt: lastSuccess?.at ? new Date(lastSuccess.at) : null,
      failedSince: failing?.since ? new Date(failing.since) : null,
      failedRuns: failing?.runs ?? 0,
      failedUsers: failing?.users ?? 0,
      lastError: hideKeys(failing?.lastError ?? null),
    },
  };
}

export async function getRevenue(days: number, timeZone: string) {
  const { now, since, previousSince } = range(days);
  // The rupee totals leave out Polar's dollar payments, which are summed on their own.
  const captured = and(eq(payments.status, "captured"), eq(payments.currency, "INR"))!;
  const capturedUsd = and(eq(payments.status, "captured"), eq(payments.currency, "USD"));

  const [[totals], byDay, byPlan, recent, statuses] = await Promise.all([
    db
      .select({
        paise:
          sql<number>`coalesce(sum(${payments.amount}) filter (where ${captured} and ${payments.updatedAt} >= ${since}), 0)`.mapWith(
            Number,
          ),
        previousPaise:
          sql<number>`coalesce(sum(${payments.amount}) filter (where ${captured} and ${payments.updatedAt} >= ${previousSince} and ${payments.updatedAt} < ${since}), 0)`.mapWith(
            Number,
          ),
        allTimePaise: sql<number>`coalesce(sum(${payments.amount}) filter (where ${captured}), 0)`.mapWith(Number),
        usdCents:
          sql<number>`coalesce(sum(${payments.amount}) filter (where ${capturedUsd} and ${payments.updatedAt} >= ${since}), 0)`.mapWith(
            Number,
          ),
        payers: sql<number>`count(distinct ${payments.userId}) filter (where ${payments.status} = 'captured')`.mapWith(
          Number,
        ),
        checkouts: filtered(sql`${payments.createdAt} >= ${since}`),
        checkoutsPaid: filtered(sql`${payments.createdAt} >= ${since} and ${payments.status} = 'captured'`),
      })
      .from(payments),
    db
      .select({ day: dayOf(payments.updatedAt, timeZone), paise: sum(payments.amount).mapWith(Number) })
      .from(payments)
      .where(and(captured, gte(payments.updatedAt, since)))
      .groupBy(sql`1`),
    db
      .select({ plan: subscriptions.plan, active: count() })
      .from(subscriptions)
      .where(
        and(
          sql`${subscriptions.status} in ('active', 'cancelled', 'past_due')`,
          sql`${subscriptions.currentPeriodEnd} > now()`,
        ),
      )
      .groupBy(subscriptions.plan),
    db
      .select({
        id: payments.id,
        createdAt: payments.createdAt,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        method: payments.method,
        provider: payments.provider,
        providerPaymentId: payments.providerPaymentId,
        plan: subscriptions.plan,
        userId: users.id,
        email: users.email,
      })
      .from(payments)
      .innerJoin(users, eq(users.id, payments.userId))
      .leftJoin(subscriptions, eq(subscriptions.id, payments.subscriptionId))
      .orderBy(desc(payments.createdAt))
      .limit(50),
    db
      .select({ label: payments.status, count: count() })
      .from(payments)
      .where(gte(payments.createdAt, since))
      .groupBy(payments.status),
  ]);

  return {
    days,
    totals: totals ?? {
      paise: 0,
      previousPaise: 0,
      allTimePaise: 0,
      usdCents: 0,
      payers: 0,
      checkouts: 0,
      checkoutsPaid: 0,
    },
    byDay: fillDays(dayKeys(days, timeZone, now), byDay, ["paise"]),
    activeSubscriptions: byPlan,
    statuses,
    payments: recent,
    razorpayConfigured: Boolean(env.RAZORPAY_KEY_ID),
  };
}

export async function getContent(days: number) {
  const { since } = range(days);
  const recentViews = db
    .select({ shareLinkId: linkViews.shareLinkId, views: count().as("views") })
    .from(linkViews)
    .where(gte(linkViews.viewedAt, since))
    .groupBy(linkViews.shareLinkId)
    .as("recent_views");

  const [[resumeTotals], byTemplate, versionKinds, [sharing], topLinks, [other], [uploadTotals]] = await Promise.all([
    db
      .select({
        total: count(),
        live: filtered(sql`${resumes.deletedAt} is null and ${resumes.archivedAt} is null`),
        archived: filtered(sql`${resumes.deletedAt} is null and ${resumes.archivedAt} is not null`),
        deleted: filtered(sql`${resumes.deletedAt} is not null`),
        structured: filtered(sql`${resumes.mode} = 'structured'`),
        code: filtered(sql`${resumes.mode} = 'code'`),
        tailored: filtered(sql`${resumes.jobId} is not null`),
      })
      .from(resumes),
    db
      .select({ label: sql<string>`coalesce(${resumes.templateId}, 'Own LaTeX')`, count: count() })
      .from(resumes)
      .where(isNull(resumes.deletedAt))
      .groupBy(sql`1`)
      .orderBy(desc(count())),
    db
      .select({ label: resumeVersions.kind, count: count() })
      .from(resumeVersions)
      .where(gte(resumeVersions.createdAt, since))
      .groupBy(resumeVersions.kind)
      .orderBy(desc(count())),
    db
      .select({
        links: filtered(sql`${shareLinks.deletedAt} is null`),
        listed: filtered(sql`${shareLinks.deletedAt} is null and ${shareLinks.isListed}`),
        protected: filtered(sql`${shareLinks.deletedAt} is null and ${shareLinks.passwordHash} is not null`),
        plain: filtered(
          sql`${shareLinks.deletedAt} is null and not ${shareLinks.isListed} and ${shareLinks.passwordHash} is null`,
        ),
        views: sql<number>`coalesce(sum(${shareLinks.viewCount}), 0)`.mapWith(Number),
      })
      .from(shareLinks),
    db
      .select({
        id: shareLinks.id,
        slug: shareLinks.slug,
        username: users.username,
        resumeTitle: resumes.title,
        views: sql<number>`coalesce(${recentViews.views}, 0)`.mapWith(Number),
        totalViews: shareLinks.viewCount,
      })
      .from(shareLinks)
      .innerJoin(users, eq(users.id, shareLinks.userId))
      .innerJoin(resumes, eq(resumes.id, shareLinks.resumeId))
      .leftJoin(recentViews, eq(recentViews.shareLinkId, shareLinks.id))
      .where(isNull(shareLinks.deletedAt))
      .orderBy(sql`5 desc`, desc(shareLinks.viewCount))
      .limit(10),
    db
      .select({
        customTemplates: sql<number>`(select count(*) from ${customTemplates})`.mapWith(Number),
        jobs: sql<number>`(select count(*) from ${jobs})`.mapWith(Number),
        jobsFromUrl: sql<number>`(select count(*) from ${jobs} where ${jobs.sourceUrl} is not null)`.mapWith(Number),
      })
      .from(sql`(select 1) as one`),
    db
      .select({
        files: count(),
        bytes: sql<number>`coalesce(sum(${uploads.sizeBytes}), 0)`.mapWith(Number),
        pdf: filtered(sql`${uploads.kind} = 'pdf'`),
        tex: filtered(sql`${uploads.kind} = 'tex'`),
        text: filtered(sql`${uploads.kind} = 'text'`),
      })
      .from(uploads),
  ]);

  return {
    days,
    resumes: resumeTotals ?? { total: 0, live: 0, archived: 0, deleted: 0, structured: 0, code: 0, tailored: 0 },
    byTemplate,
    versionKinds,
    sharing: sharing ?? { links: 0, listed: 0, protected: 0, plain: 0, views: 0 },
    topLinks,
    customTemplates: other?.customTemplates ?? 0,
    jobs: other?.jobs ?? 0,
    jobsFromUrl: other?.jobsFromUrl ?? 0,
    uploads: uploadTotals ?? { files: 0, bytes: 0, pdf: 0, tex: 0, text: 0 },
  };
}

export async function compilerHealth() {
  if (!env.COMPILER_URL) return { mode: "in-process" as const, ok: true, latencyMs: null };
  const started = Date.now();
  try {
    const res = await fetch(`${env.COMPILER_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return { mode: "service" as const, ok: res.ok, latencyMs: Date.now() - started };
  } catch {
    return { mode: "service" as const, ok: false, latencyMs: null };
  }
}

export async function getSystem() {
  const started = Date.now();
  const [database, tables, connections, compiler, backup, [lastWebhook]] = await Promise.all([
    pool.query<{ version: string; size: string }>(
      "select current_setting('server_version') as version, pg_database_size(current_database()) as size",
    ),
    pool.query<{ name: string; rows: string; size: string }>(
      `select relname as name, n_live_tup as rows, pg_total_relation_size(relid) as size
       from pg_stat_user_tables order by pg_total_relation_size(relid) desc`,
    ),
    pool.query<{ state: string | null; count: string }>(
      "select state, count(*) from pg_stat_activity where datname = current_database() group by state",
    ),
    compilerHealth(),
    storage.latest("backups/postgres/").catch(() => null),
    db
      .select({ receivedAt: webhookEvents.receivedAt })
      .from(webhookEvents)
      .orderBy(desc(webhookEvents.receivedAt))
      .limit(1),
  ]);
  const databaseLatencyMs = Date.now() - started;
  const memory = process.memoryUsage();

  return {
    api: {
      nodeVersion: process.version,
      uptimeSeconds: Math.round(process.uptime()),
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      environment: env.NODE_ENV,
    },
    database: {
      version: database.rows[0]?.version ?? "unknown",
      sizeBytes: Number(database.rows[0]?.size ?? 0),
      latencyMs: databaseLatencyMs,
      connections: connections.rows.map((row) => ({ state: row.state ?? "background", count: Number(row.count) })),
      tables: tables.rows.map((row) => ({ name: row.name, rows: Number(row.rows), sizeBytes: Number(row.size) })),
    },
    compiler,
    backup: backup && { key: backup.key, sizeBytes: backup.sizeBytes, modifiedAt: backup.modifiedAt },
    lastWebhookAt: lastWebhook?.receivedAt ?? null,
    integrations: [
      { name: "Google sign-in", configured: Boolean(env.GOOGLE_CLIENT_ID) },
      { name: "GitHub sign-in", configured: Boolean(env.GITHUB_CLIENT_ID) },
      { name: "ChatGPT sign-in", configured: Boolean(env.CHATGPT_CLIENT_ID) },
      {
        name: `AI (${env.AI_PROVIDER})`,
        configured: Boolean(
          { openai: env.OPENAI_API_KEY, anthropic: env.ANTHROPIC_API_KEY, openrouter: env.OPENROUTER_API_KEY }[
            env.AI_PROVIDER
          ],
        ),
      },
      { name: `Storage (${env.STORAGE_DRIVER})`, configured: true },
      {
        name: env.RAZORPAY_MODE === "test" ? "Razorpay (test mode)" : "Razorpay",
        configured: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_WEBHOOK_SECRET),
      },
      { name: "PostHog events", configured: Boolean(env.POSTHOG_KEY) },
      { name: "PostHog admin reads", configured: Boolean(env.POSTHOG_PERSONAL_API_KEY && env.POSTHOG_PROJECT_ID) },
      { name: "Jina Reader key", configured: Boolean(env.JINA_API_KEY) },
    ],
  };
}
