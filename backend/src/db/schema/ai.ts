import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth.js";
import { createdAt, timestamps } from "./columns.js";
import { jobs, resumes, resumeVersions } from "./resumes.js";

export const aiStep = pgEnum("ai_step", [
  "import",
  "jd_parse",
  "plan",
  "rewrite",
  "verify",
  "inline_edit",
  "chat_edit",
  "fix_compile",
  "draft",
  "ats_match",
  "ats_review",
]);

// pending: reserved against the quota while the model is still working.
export const aiRunStatus = pgEnum("ai_run_status", ["pending", "succeeded", "failed"]);

// Log of every AI call: for cost tracking, quotas and acceptance rate.
export const aiRuns = pgTable(
  "ai_runs",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    resumeId: uuid().references(() => resumes.id, { onDelete: "set null" }),
    jobId: uuid().references(() => jobs.id, { onDelete: "set null" }),
    // The version the AI's accepted changes were saved as, if any.
    versionId: uuid().references(() => resumeVersions.id, {
      onDelete: "set null",
    }),
    step: aiStep().notNull(),
    status: aiRunStatus().notNull(),
    model: text().notNull(),
    inputTokens: integer().notNull().default(0),
    cachedInputTokens: integer().notNull().default(0),
    outputTokens: integer().notNull().default(0),
    // Cost in millionths of a US dollar, to avoid floating point.
    costUsdMicros: integer().notNull().default(0),
    latencyMs: integer(),
    patchOps: jsonb(),
    acceptedOpIds: jsonb().$type<string[]>(),
    error: text(),
    // Run on the user's own API key; doesn't count toward plan limits.
    byok: boolean().notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    index().on(t.userId, t.createdAt),
    index().on(t.createdAt),
    index().on(t.resumeId),
    index().on(t.versionId),
    index().on(t.jobId),
  ],
);

export const aiProvider = pgEnum("ai_provider", ["openai", "anthropic", "openrouter"]);

// A user's own AI provider key (bring your own key). Encrypted at rest; only the last
// four characters are ever shown back.
// One key per provider; at most one of a user's keys is enabled.
export const userAiKeys = pgTable(
  "user_ai_keys",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: aiProvider().notNull(),
    enabled: boolean().notNull().default(true),
    // Used for every AI step when set; otherwise the provider's default models.
    modelId: text(),
    modelIds: text().array().notNull().default([]),
    encryptedKey: text().notNull(),
    keyHint: text().notNull(),
    verifiedAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.provider] }),
    uniqueIndex("user_ai_keys_one_enabled")
      .on(t.userId)
      .where(sql`${t.enabled}`),
  ],
);
