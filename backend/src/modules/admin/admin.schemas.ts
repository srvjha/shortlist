import { z } from "zod";
import { analyticsQuery } from "../analytics/analytics.schemas.js";
import { usageResponse } from "../usage/usage.routes.js";

export const adminRangeQuery = analyticsQuery;

const plan = z.enum(["free", "season_pass", "pro"]);
const int = z.number().int();
const labelled = z.array(z.object({ label: z.string(), count: int }));

export const adminOverviewResponse = z.object({
  days: int,
  totals: z.object({
    users: int,
    guests: int,
    newUsers: int,
    previousNewUsers: int,
    activeUsers: int,
    previousActiveUsers: int,
    paidUsers: int,
    suspendedUsers: int,
    resumes: int,
    resumesCreated: int,
    previousResumesCreated: int,
    aiRuns: int,
    previousAiRuns: int,
    aiFailed: int,
    aiCostUsdMicros: int,
    previousAiCostUsdMicros: int,
    revenuePaise: int,
    previousRevenuePaise: int,
    shareViews: int,
    previousShareViews: int,
  }),
  byDay: z.array(z.object({ day: z.string(), signups: int, resumes: int, aiRuns: int, views: int })),
  plans: labelled,
  providers: labelled,
  funnel: z.object({ signedUp: int, createdResume: int, usedAi: int, shared: int, paid: int }),
  recentSignups: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      email: z.string(),
      image: z.string().nullable(),
      plan,
      createdAt: z.date(),
      providers: z.array(z.string()),
    }),
  ),
});

export const adminUsersQuery = z.object({
  q: z.string().trim().max(100).optional(),
  plan: plan.optional(),
  status: z.enum(["active", "suspended", "guest"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export const adminUserListResponse = z.object({
  users: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      email: z.string(),
      image: z.string().nullable(),
      username: z.string(),
      plan,
      isAnonymous: z.boolean(),
      suspendedAt: z.date().nullable(),
      createdAt: z.date(),
      lastActiveAt: z.date().nullable(),
      providers: z.array(z.string()),
      resumes: int,
      aiRuns: int,
    }),
  ),
  page: int,
  pageSize: int,
  total: int,
});

export const adminUserParams = z.object({ userId: z.uuid() });
export const adminSubscriptionParams = adminUserParams.extend({ subscriptionId: z.uuid() });

export const adminUserResponse = z.object({
  user: z.object({
    id: z.uuid(),
    name: z.string(),
    email: z.string(),
    emailVerified: z.boolean(),
    image: z.string().nullable(),
    username: z.string(),
    plan,
    isAnonymous: z.boolean(),
    suspendedAt: z.date().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
  accounts: z.array(z.object({ providerId: z.string(), createdAt: z.date() })),
  resumes: z.array(
    z.object({
      id: z.uuid(),
      title: z.string(),
      mode: z.enum(["structured", "code"]),
      templateId: z.string().nullable(),
      createdAt: z.date(),
      updatedAt: z.date(),
      archivedAt: z.date().nullable(),
      deletedAt: z.date().nullable(),
      versions: int,
    }),
  ),
  ai: z.object({
    runs: int,
    byokRuns: int,
    costUsdMicros: int,
    lastRunAt: z.date().nullable(),
    bySteps: z.array(z.object({ step: z.string(), runs: int, failed: int, costUsdMicros: int })),
  }),
  usage: usageResponse,
  subscriptions: z.array(
    z.object({
      id: z.uuid(),
      plan: z.enum(["season_pass", "pro"]),
      status: z.enum(["created", "active", "past_due", "cancelled", "expired"]),
      currentPeriodStart: z.date().nullable(),
      currentPeriodEnd: z.date().nullable(),
      providerSubscriptionId: z.string().nullable(),
      complimentary: z.boolean(),
      createdAt: z.date(),
    }),
  ),
  payments: z.array(
    z.object({
      id: z.uuid(),
      // In the currency's minor unit (paise, cents).
      amount: int,
      currency: z.string(),
      status: z.enum(["created", "captured", "failed", "refunded"]),
      method: z.string().nullable(),
      provider: z.enum(["razorpay", "polar"]),
      providerPaymentId: z.string().nullable(),
      createdAt: z.date(),
    }),
  ),
  sessions: z.array(
    z.object({
      id: z.uuid(),
      createdAt: z.date(),
      updatedAt: z.date(),
      expiresAt: z.date(),
      userAgent: z.string().nullable(),
    }),
  ),
  shareLinks: int,
  shareViews: int,
  jobs: int,
});

export const updateAdminUserBody = z.object({ suspended: z.boolean() });

export const createAdminSubscriptionBody = z.object({
  plan: z.enum(["season_pass", "pro"]),
  months: z.number().int().min(1).max(24),
});

export const adminAiResponse = z.object({
  days: int,
  totals: z.object({
    runs: int,
    failed: int,
    byok: int,
    costUsdMicros: int,
    inputTokens: int,
    cachedInputTokens: int,
    outputTokens: int,
    users: int,
  }),
  bySteps: z.array(z.object({ step: z.string(), runs: int, failed: int, costUsdMicros: int, p50Ms: int, p95Ms: int })),
  byModels: z.array(z.object({ model: z.string(), runs: int, costUsdMicros: int, tokens: int })),
  byDay: z.array(z.object({ day: z.string(), runs: int, costUsdMicros: int })),
  failures: z.array(
    z.object({
      id: z.uuid(),
      createdAt: z.date(),
      step: z.string(),
      model: z.string(),
      error: z.string().nullable(),
      userId: z.uuid(),
      email: z.string(),
    }),
  ),
  topUsers: z.array(z.object({ userId: z.uuid(), email: z.string(), name: z.string(), runs: int, costUsdMicros: int })),
});

export const adminRevenueResponse = z.object({
  days: int,
  totals: z.object({
    paise: int,
    previousPaise: int,
    allTimePaise: int,
    // Polar's dollar payments in the period, left out of the rupee totals.
    usdCents: int,
    payers: int,
    checkouts: int,
    checkoutsPaid: int,
  }),
  byDay: z.array(z.object({ day: z.string(), paise: int })),
  activeSubscriptions: z.array(z.object({ plan: z.enum(["season_pass", "pro"]), active: int })),
  statuses: labelled,
  payments: z.array(
    z.object({
      id: z.uuid(),
      createdAt: z.date(),
      // In the currency's minor unit (paise, cents).
      amount: int,
      currency: z.string(),
      status: z.enum(["created", "captured", "failed", "refunded"]),
      method: z.string().nullable(),
      provider: z.enum(["razorpay", "polar"]),
      providerPaymentId: z.string().nullable(),
      plan: z.enum(["season_pass", "pro"]).nullable(),
      userId: z.uuid(),
      email: z.string(),
    }),
  ),
  razorpayConfigured: z.boolean(),
});

export const adminContentQuery = adminRangeQuery.pick({ days: true });

export const adminContentResponse = z.object({
  days: int,
  resumes: z.object({ total: int, live: int, archived: int, deleted: int, structured: int, code: int, tailored: int }),
  byTemplate: labelled,
  versionKinds: labelled,
  sharing: z.object({ links: int, listed: int, protected: int, plain: int, views: int }),
  topLinks: z.array(
    z.object({
      id: z.uuid(),
      slug: z.string(),
      username: z.string(),
      resumeTitle: z.string(),
      views: int,
      totalViews: int,
    }),
  ),
  customTemplates: int,
  jobs: int,
  jobsFromUrl: int,
  uploads: z.object({ files: int, bytes: int, pdf: int, tex: int, text: int }),
});

const trafficData = z.object({
  totals: z.object({ pageviews: int, visitors: int, sessions: int, previousPageviews: int, previousVisitors: int }),
  byDay: z.array(z.object({ day: z.string(), views: int, visitors: int })),
  pages: labelled,
  referrers: labelled,
  // Visitors who arrived on a tagged link, by source and campaign, and how many of them signed up.
  campaigns: z.array(z.object({ source: z.string(), campaign: z.string(), visitors: int, signups: int })),
  countries: labelled,
  devices: labelled,
  browsers: labelled,
  events: z.array(z.object({ event: z.string(), count: int, people: int })),
  api: z.array(z.object({ route: z.string(), requests: int, p50Ms: int, p95Ms: int, errors: int })),
  // Compile time excludes cache hits; the lookup is the R2 round trip every compile starts with.
  compiles: z.object({
    requests: int,
    cacheHitRate: z.number(),
    compileP50Ms: int,
    compileP95Ms: int,
    lookupP50Ms: int,
    // What users wait in the editor, edit to PDF on screen; 0 until browsers report it.
    seenP50Ms: int,
    seenP95Ms: int,
  }),
  recordings: z.array(
    z.object({
      id: z.string(),
      distinctId: z.string(),
      startedAt: z.date(),
      durationSeconds: int,
      clicks: int,
      startUrl: z.string().nullable(),
      url: z.string(),
    }),
  ),
});

export const adminTrafficResponse = z.object({
  configured: z.boolean(),
  dashboardUrl: z.string(),
  error: z.string().nullable(),
  data: trafficData.nullable(),
});

export const adminSystemResponse = z.object({
  api: z.object({
    nodeVersion: z.string(),
    uptimeSeconds: int,
    rssBytes: int,
    heapUsedBytes: int,
    environment: z.string(),
  }),
  database: z.object({
    version: z.string(),
    sizeBytes: int,
    latencyMs: int,
    connections: z.array(z.object({ state: z.string(), count: int })),
    tables: z.array(z.object({ name: z.string(), rows: int, sizeBytes: int })),
  }),
  compiler: z.object({ mode: z.enum(["in-process", "service"]), ok: z.boolean(), latencyMs: int.nullable() }),
  backup: z.object({ key: z.string(), sizeBytes: int, modifiedAt: z.date() }).nullable(),
  lastWebhookAt: z.date().nullable(),
  integrations: z.array(z.object({ name: z.string(), configured: z.boolean() })),
});
