import { and, desc, eq, gt, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { env } from "../../config/env.js";
import { db } from "../../db/index.js";
import { payments, subscriptions, users } from "../../db/schema/index.js";
import { AppError, ConflictError, ForbiddenError, NotFoundError } from "../../lib/errors.js";
import { razorpay } from "../../lib/razorpay.js";
import { track } from "../../lib/analytics.js";
import { runsSince } from "../usage/quotas.js";

export const prices = { season_pass: 49_900, pro: 12_900 } as const;

type Plan = (typeof users.$inferSelect)["plan"];

// The user's plan is derived from their active subscriptions, never set directly.
export async function recomputePlan(userId: string, executor: Pick<typeof db, "select" | "update"> = db) {
  const active = await executor
    .select({ plan: subscriptions.plan })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        inArray(subscriptions.status, ["active", "cancelled", "past_due"]),
        gt(subscriptions.currentPeriodEnd, new Date()),
      ),
    );
  const plan: Plan = active.some((s) => s.plan === "pro") ? "pro" : active.length > 0 ? "season_pass" : "free";
  await executor.update(users).set({ plan }).where(eq(users.id, userId));
  return plan;
}

// A plan given for free, by an admin or a promo code; it runs for `months` from now.
export async function grantPlan(
  userId: string,
  plan: "season_pass" | "pro",
  months: number,
  executor: Pick<typeof db, "insert"> = db,
) {
  const start = new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  const [subscription] = await executor
    .insert(subscriptions)
    .values({ userId, plan, status: "active", currentPeriodStart: start, currentPeriodEnd: end })
    .returning({ id: subscriptions.id });
  return subscription!;
}

// Guest accounts are deleted after 7 days, and a plan bought or redeemed on one would go with it.
export async function assertNotGuest(userId: string, executor: Pick<typeof db, "select"> = db) {
  const [user] = await executor.select({ isAnonymous: users.isAnonymous }).from(users).where(eq(users.id, userId));
  if (user?.isAnonymous)
    throw new ForbiddenError("Create an account first, so your plan isn't deleted with this guest account");
}

export async function createCheckout(userId: string, plan: "season_pass" | "pro") {
  const keyId = env.RAZORPAY_KEY_ID;
  if (!keyId) throw new AppError(503, "PAYMENTS_NOT_CONFIGURED", "Payments are not configured");
  await assertNotGuest(userId);
  track(userId, "checkout_started", { plan });

  if (plan === "season_pass") {
    const order = await razorpay<{ id: string }>("POST", "/orders", {
      amount: prices.season_pass,
      currency: "INR",
      receipt: `sp_${Date.now()}`,
      notes: { userId, plan },
    });
    await db.transaction(async (tx) => {
      const [subscription] = await tx.insert(subscriptions).values({ userId, plan, status: "created" }).returning();
      await tx.insert(payments).values({
        userId,
        subscriptionId: subscription!.id,
        razorpayOrderId: order.id,
        amountPaise: prices.season_pass,
      });
    });
    return {
      provider: "razorpay" as const,
      keyId,
      plan,
      orderId: order.id,
      razorpaySubscriptionId: null,
      amountPaise: prices.season_pass,
      currency: "INR" as const,
    };
  }

  if (!env.RAZORPAY_PRO_PLAN_ID) throw new AppError(503, "PAYMENTS_NOT_CONFIGURED", "The Pro plan is not configured");
  const [existing] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.plan, "pro"), eq(subscriptions.status, "active")))
    .limit(1);
  if (existing) throw new ConflictError("You already have an active Pro subscription");

  const remote = await razorpay<{ id: string }>("POST", "/subscriptions", {
    plan_id: env.RAZORPAY_PRO_PLAN_ID,
    total_count: 120,
    customer_notify: 1,
    notes: { userId, plan },
  });
  await db.insert(subscriptions).values({ userId, plan, status: "created", razorpaySubscriptionId: remote.id });
  return {
    provider: "razorpay" as const,
    keyId,
    plan,
    orderId: null,
    razorpaySubscriptionId: remote.id,
    amountPaise: prices.pro,
    currency: "INR" as const,
  };
}

export async function getSubscription(userId: string) {
  const [user] = await db.select({ plan: users.plan }).from(users).where(eq(users.id, userId));
  const [subscription] = await db
    .select({
      id: subscriptions.id,
      plan: subscriptions.plan,
      status: subscriptions.status,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      cancelledAt: subscriptions.cancelledAt,
    })
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), inArray(subscriptions.status, ["active", "cancelled", "past_due"])))
    .orderBy(desc(subscriptions.currentPeriodEnd))
    .limit(1);
  return { plan: user!.plan, subscription: subscription ?? null };
}

// Cancels Pro at the end of the current billing period. Season Pass simply runs out.
export async function cancelSubscription(userId: string) {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    // An admin-granted Pro row has no Razorpay subscription, so skip it to find the one that bills.
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.plan, "pro"),
        eq(subscriptions.status, "active"),
        isNotNull(subscriptions.razorpaySubscriptionId),
      ),
    )
    .limit(1);
  if (!subscription?.razorpaySubscriptionId) throw new NotFoundError("Active Pro subscription");
  await razorpay("POST", `/subscriptions/${subscription.razorpaySubscriptionId}/cancel`, { cancel_at_cycle_end: 1 });
  await db
    .update(subscriptions)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(eq(subscriptions.id, subscription.id));
  return getSubscription(userId);
}

export const REFUND_WINDOW_MS = 6 * 60 * 60 * 1000;
// A refund is for trying the plan and not liking it, not for using it fully and getting the money back.
export const REFUND_USE_LIMIT = 3;

async function whyNotRefundable(userId: string, since: Date) {
  const [earlier] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(and(eq(payments.userId, userId), eq(payments.status, "refunded")))
    .limit(1);
  if (earlier) return "Each account can get one refund, and yours has already had one.";
  const [tailored, written] = await Promise.all([
    runsSince(userId, "tailor", since),
    runsSince(userId, "draft", since),
  ]);
  return tailored > REFUND_USE_LIMIT || written > REFUND_USE_LIMIT
    ? `Refunds are for trying the plan: you've made ${tailored} tailored and ${written} AI-written resumes since paying, and the limit is ${REFUND_USE_LIMIT} of each.`
    : null;
}

type RemotePayment = { amount: number; status: string; fee?: number | null; amount_refunded?: number };

// The amount paid minus exactly what Razorpay kept for it: `fee` already includes the GST on it.
export function refundablePaise(payment: RemotePayment) {
  if (payment.status !== "captured" || payment.amount_refunded) {
    throw new ConflictError("This payment has already been refunded");
  }
  if (typeof payment.fee !== "number") {
    throw new AppError(
      503,
      "REFUND_FEE_UNAVAILABLE",
      "Razorpay hasn't reported its fee for this payment yet, so the refund can't be worked out. Try again in a few minutes.",
    );
  }
  const refund = payment.amount - payment.fee;
  if (refund <= 0) throw new ConflictError("Nothing is left to refund after Razorpay's fee");
  return refund;
}

const refundable = (userId: string, now: Date) =>
  and(
    eq(payments.userId, userId),
    eq(payments.status, "captured"),
    isNull(payments.refundedAt),
    isNotNull(payments.razorpayPaymentId),
    gt(payments.capturedAt, new Date(now.getTime() - REFUND_WINDOW_MS)),
  );

export async function getRefundQuote(userId: string, now = new Date()) {
  const [row] = await db
    .select({
      id: payments.id,
      razorpayPaymentId: payments.razorpayPaymentId,
      capturedAt: payments.capturedAt,
      plan: subscriptions.plan,
    })
    .from(payments)
    .leftJoin(subscriptions, eq(subscriptions.id, payments.subscriptionId))
    .where(refundable(userId, now))
    .orderBy(desc(payments.capturedAt))
    .limit(1);
  if (!row) return { quote: null, reason: null };
  const reason = await whyNotRefundable(userId, row.capturedAt!);
  if (reason) return { quote: null, reason };
  const remote = await razorpay<RemotePayment>("GET", `/payments/${row.razorpayPaymentId}`);
  // Part of it may already have been refunded by hand, as a goodwill credit; then there's no self-serve refund.
  if (remote.amount_refunded) return { quote: null, reason: null };
  const refundPaise = refundablePaise(remote);
  return {
    quote: {
      paymentId: row.id,
      plan: row.plan,
      amountPaidPaise: remote.amount,
      feePaise: remote.amount - refundPaise,
      refundPaise,
      refundableUntil: new Date(row.capturedAt!.getTime() + REFUND_WINDOW_MS),
    },
    reason: null,
  };
}

// Leaves updated_at alone: the admin revenue view dates a captured payment by it.
const keepUpdatedAt = sql`${payments.updatedAt}`;

export async function requestRefund(userId: string, paymentId: string, now = new Date()) {
  // Claimed before Razorpay is called, so a double click or a second tab gets a conflict, not a second refund.
  const [row] = await db
    .update(payments)
    .set({ refundedAt: now, updatedAt: keepUpdatedAt })
    .where(and(eq(payments.id, paymentId), refundable(userId, now)))
    .returning();
  if (!row) throw new ConflictError("Refunds are available once per payment, within 6 hours of paying");
  const reason = await whyNotRefundable(userId, row.capturedAt!);
  const release = () =>
    db.update(payments).set({ refundedAt: null, updatedAt: keepUpdatedAt }).where(eq(payments.id, row.id));

  if (reason) {
    await release();
    throw new ConflictError(reason);
  }

  const [subscription] = row.subscriptionId
    ? await db.select().from(subscriptions).where(eq(subscriptions.id, row.subscriptionId))
    : [];
  const note = `Self-serve refund ${row.id}`;
  let sent = false;
  let refund: { id: string; amount: number };
  try {
    const remote = await razorpay<RemotePayment>("GET", `/payments/${row.razorpayPaymentId}`);
    const amount = refundablePaise(remote);
    // Pro is cancelled first: refunding and then failing to cancel would leave Razorpay charging every month.
    if (subscription?.plan === "pro" && subscription.razorpaySubscriptionId && !subscription.cancelledAt) {
      await razorpay("POST", `/subscriptions/${subscription.razorpaySubscriptionId}/cancel`, {
        cancel_at_cycle_end: 0,
      });
      subscription.cancelledAt = now;
      await db.update(subscriptions).set({ cancelledAt: now }).where(eq(subscriptions.id, subscription.id));
    }
    sent = true;
    refund = await razorpay("POST", `/payments/${row.razorpayPaymentId}/refund`, {
      amount,
      speed: "normal",
      notes: { userId, reason: note },
    });
  } catch (error) {
    // A refund call that timed out may still have gone through, so Razorpay is asked for this refund (by its note)
    // before the claim is released; otherwise the plan would keep running on money already returned.
    const done = sent
      ? await Promise.resolve()
          .then(() =>
            razorpay<{ items?: { id: string; amount: number; notes?: { reason?: string } }[] }>(
              "GET",
              `/payments/${row.razorpayPaymentId}/refunds`,
            ),
          )
          .catch(() => undefined)
      : undefined;
    const ours = done?.items?.find((item) => item.notes?.reason === note);
    if (!ours) {
      await release();
      throw error;
    }
    refund = ours;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(payments)
      .set({ status: "refunded", refundedPaise: refund.amount, razorpayRefundId: refund.id })
      .where(eq(payments.id, row.id));
    if (subscription) {
      await tx
        .update(subscriptions)
        .set({ status: "expired", currentPeriodEnd: now, cancelledAt: subscription.cancelledAt ?? now })
        .where(eq(subscriptions.id, subscription.id));
    }
    await recomputePlan(userId, tx);
  });
  track(userId, "refund_requested", { amount_inr: refund.amount / 100 });
  return { paymentId: row.id, refundPaise: refund.amount, razorpayRefundId: refund.id };
}
