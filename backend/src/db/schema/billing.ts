import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth.js";
import { createdAt, timestamps } from "./columns.js";

export const subscriptionPlan = pgEnum("subscription_plan", ["season_pass", "pro"]);

export const subscriptionStatus = pgEnum("subscription_status", [
  "created",
  "active",
  "past_due",
  "cancelled",
  "expired",
]);

// A paid plan. Season Pass is a one-time payment covering 6 months;
// Pro is a monthly Razorpay subscription.
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    plan: subscriptionPlan().notNull(),
    status: subscriptionStatus().notNull().default("created"),
    razorpaySubscriptionId: text().unique(),
    currentPeriodStart: timestamp({ withTimezone: true }),
    currentPeriodEnd: timestamp({ withTimezone: true }),
    cancelledAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index().on(t.userId)],
);

export const paymentStatus = pgEnum("payment_status", ["created", "captured", "failed", "refunded"]);

// Each Razorpay transaction, for receipts, refunds and support.
export const payments = pgTable(
  "payments",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: uuid().references(() => subscriptions.id, {
      onDelete: "set null",
    }),
    razorpayOrderId: text().notNull(),
    razorpayPaymentId: text().unique(),
    amountPaise: integer().notNull(),
    currency: text().notNull().default("INR"),
    status: paymentStatus().notNull().default("created"),
    method: text(), // upi, card, netbanking, ...
    capturedAt: timestamp({ withTimezone: true }),
    // Set when a self-serve refund is claimed, before Razorpay is called, so a second request can't refund again.
    refundedAt: timestamp({ withTimezone: true }),
    refundedPaise: integer(),
    razorpayRefundId: text().unique(),
    // Latest webhook payload from Razorpay, kept for debugging.
    raw: jsonb(),
    ...timestamps,
  },
  (t) => [index().on(t.userId), index().on(t.razorpayOrderId), index().on(t.subscriptionId)],
);

// Webhook deliveries already handled; providers retry, so each event id is processed once.
export const webhookEvents = pgTable("webhook_events", {
  id: text().primaryKey(), // "razorpay:<event id>"
  receivedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// "ambassador" codes belong to one person, so their redemptions show who brought which users.
export const promoCodeKind = pgEnum("promo_code_kind", ["promo", "ambassador"]);

// A code that grants a plan for free, like PLACEMENT100 or RAHUL-IITD.
export const promoCodes = pgTable("promo_codes", {
  id: uuid().primaryKey().defaultRandom(),
  // Stored uppercase; redemption matches case-insensitively.
  code: text().notNull().unique(),
  kind: promoCodeKind().notNull().default("promo"),
  plan: subscriptionPlan().notNull().default("season_pass"),
  months: integer().notNull(),
  // Null means no limit.
  maxRedemptions: integer(),
  expiresAt: timestamp({ withTimezone: true }),
  active: boolean().notNull().default(true),
  // Who the code is for: the ambassador's name, or the campaign.
  owner: text(),
  note: text(),
  ...timestamps,
});

// One row per use. Each user can redeem one code ever, so codes can't be stacked for more months.
export const promoRedemptions = pgTable(
  "promo_redemptions",
  {
    id: uuid().primaryKey().defaultRandom(),
    promoCodeId: uuid()
      .notNull()
      .references(() => promoCodes.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: uuid().references(() => subscriptions.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.promoCodeId), index().on(t.subscriptionId)],
);
