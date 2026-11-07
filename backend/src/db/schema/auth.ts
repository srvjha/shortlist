import { sql } from "drizzle-orm";
import { boolean, check, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt, timestamps } from "./columns.js";

export const userPlan = pgEnum("user_plan", ["free", "season_pass", "pro", "lifetime"]);

export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    email: text().notNull().unique(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    // Generated at signup from the name or email; the user can change it later.
    username: text().notNull().unique(),
    usernameChangedAt: timestamp({ withTimezone: true }),
    plan: userPlan().notNull().default("free"),
    // Guest accounts from the "Continue as guest" button; removed after a few days.
    isAnonymous: boolean().notNull().default(false),
    // Set by an admin; a suspended user can't sign in and their sessions are revoked.
    suspendedAt: timestamp({ withTimezone: true }),
    // Set by an admin; AI runs before it don't count toward this month's limits.
    usageResetAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [check("users_username_format", sql`${t.username} ~ '^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$'`)],
);

// Old usernames keep redirecting to their owner so shared links don't break,
// and stay reserved so nobody else can take them.
export const usernameRedirects = pgTable(
  "username_redirects",
  {
    oldUsername: text().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text().notNull().unique(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    ...timestamps,
  },
  (t) => [index().on(t.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text().notNull(),
    providerId: text().notNull(),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    ...timestamps,
  },
  (t) => [index().on(t.userId)],
);

export const verifications = pgTable(
  "verifications",
  {
    id: uuid().primaryKey().defaultRandom(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index().on(t.identifier)],
);
