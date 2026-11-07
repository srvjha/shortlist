import { randomUUID } from "node:crypto";
import { and, desc, eq, gt, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { payments, subscriptions, users } from "../../db/schema/index.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../../lib/errors.js";
import { track } from "../../lib/analytics.js";
import { runsSince } from "../usage/quotas.js";
import { APP, CURRENCY, dodo, type PaidPlan, prices, startCheckout } from "./dodo.js";

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
  const has = (plan: Plan) => active.some((s) => s.plan === plan);
  const plan: Plan = has("lifetime") ? "lifetime" : has("pro") ? "pro" : active.length > 0 ? "season_pass" : "free";
  await executor.update(users).set({ plan }).where(eq(users.id, userId));
  return plan;
}

// A plan given for free, by an admin or a promo code; it runs for `months` from now.
export async function grantPlan(
  userId: string,
  plan: "season_pass" | "pro" | "lifetime",
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

export const pricing = () => ({ currency: CURRENCY, ...prices });

export async function createCheckout(userId: string, plan: PaidPlan) {
  await assertNotGuest(userId);
  const current = await db
    .select({ plan: subscriptions.plan })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        inArray(subscriptions.status, ["active", "cancelled", "past_due"]),
        gt(subscriptions.currentPeriodEnd, new Date()),
      ),
    );
  if (current.some((s) => s.plan === "lifetime")) throw new ConflictError("You already have the Pro plan");
  if (plan === "pro" && current.some((s) => s.plan === "pro")) {
    throw new ConflictError("You already have an active Basic plan");
  }
  track(userId, "checkout_started", { plan, provider: "dodo" });

  const [user] = await db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, userId));
  const checkoutId = randomUUID();
  const session = await startCheckout({ checkoutId, userId, email: user!.email, name: user!.name, plan });
  const amount = prices[plan];
  // Written after the session exists, but before the buyer can reach its page and pay.
  await db.transaction(async (tx) => {
    await tx.insert(subscriptions).values({ id: checkoutId, userId, plan, status: "created", provider: "dodo" });
    await tx.insert(payments).values({
      userId,
      subscriptionId: checkoutId,
      provider: "dodo",
      providerCheckoutId: session.sessionId,
      amount,
      currency: CURRENCY,
    });
  });
  return { checkoutId, url: session.url, plan, amount, currency: CURRENCY };
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
      // Only a plan billed by a provider subscription renews; passes and given plans run out, and Pro never ends.
      renews: sql<boolean>`${subscriptions.providerSubscriptionId} is not null`,
    })
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), inArray(subscriptions.status, ["active", "cancelled", "past_due"])))
    .orderBy(desc(subscriptions.currentPeriodEnd))
    .limit(1);
  return { plan: user!.plan, subscription: subscription ?? null };
}

// Cancels Basic at the end of the current billing period. A Season Pass runs out, and Pro has nothing to cancel.
export async function cancelSubscription(userId: string) {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    // An admin-granted or one-time Basic row has no provider subscription, so skip it to find the one that bills.
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.plan, "pro"),
        eq(subscriptions.status, "active"),
        eq(subscriptions.provider, "dodo"),
        isNotNull(subscriptions.providerSubscriptionId),
      ),
    )
    .limit(1);
  if (!subscription?.providerSubscriptionId) throw new NotFoundError("Active Basic subscription");
  await dodo().subscriptions.update(subscription.providerSubscriptionId, { cancel_at_next_billing_date: true });
  await db
    .update(subscriptions)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(eq(subscriptions.id, subscription.id));
  return getSubscription(userId);
}

export const REFUND_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
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

const refundable = (userId: string, now: Date) =>
  and(
    eq(payments.userId, userId),
    eq(payments.provider, "dodo"),
    eq(payments.status, "captured"),
    isNull(payments.refundedAt),
    isNotNull(payments.providerPaymentId),
    gt(payments.capturedAt, new Date(now.getTime() - REFUND_WINDOW_MS)),
  );

export async function getRefundQuote(userId: string, now = new Date()) {
  const [row] = await db
    .select({ id: payments.id, amount: payments.amount, capturedAt: payments.capturedAt, plan: subscriptions.plan })
    .from(payments)
    .leftJoin(subscriptions, eq(subscriptions.id, payments.subscriptionId))
    .where(refundable(userId, now))
    .orderBy(desc(payments.capturedAt))
    .limit(1);
  if (!row) return { quote: null, reason: null };
  const reason = await whyNotRefundable(userId, row.capturedAt!);
  if (reason) return { quote: null, reason };
  return {
    quote: {
      paymentId: row.id,
      plan: row.plan,
      currency: CURRENCY,
      refund: row.amount,
      refundableUntil: new Date(row.capturedAt!.getTime() + REFUND_WINDOW_MS),
    },
    reason: null,
  };
}

// Leaves updated_at alone: the admin revenue view dates a captured payment by it.
const keepUpdatedAt = sql`${payments.updatedAt}`;

export async function requestRefund(userId: string, paymentId: string, now = new Date()) {
  // Claimed before the provider is called, so a double click or a second tab gets a conflict, not a second refund.
  const [row] = await db
    .update(payments)
    .set({ refundedAt: now, updatedAt: keepUpdatedAt })
    .where(and(eq(payments.id, paymentId), refundable(userId, now)))
    .returning();
  if (!row) throw new ConflictError("Refunds are available once per payment, within 7 days of paying");
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
  const remoteId = row.providerPaymentId!;
  let sent = false;
  let refundId: string;
  try {
    const payment = await dodo().payments.retrieve(remoteId);
    const alreadyRefunded = payment.refunds.some((refund) => refund.status !== "failed");
    if (payment.status !== "succeeded" || alreadyRefunded) {
      throw new ConflictError("This payment has already been refunded");
    }
    // A recurring Basic is cancelled first: refunding and then failing to cancel would leave it charging every month.
    if (subscription?.providerSubscriptionId && !subscription.cancelledAt) {
      await dodo().subscriptions.update(subscription.providerSubscriptionId, { status: "cancelled" });
      subscription.cancelledAt = now;
      await db.update(subscriptions).set({ cancelledAt: now }).where(eq(subscriptions.id, subscription.id));
    }
    sent = true;
    // No items: Dodo refunds everything charged, tax included, in whatever currency the buyer paid.
    const refund = await dodo().refunds.create({ payment_id: remoteId, reason: note, metadata: { app: APP } });
    refundId = refund.refund_id;
  } catch (error) {
    // A refund call that timed out may still have gone through, so Dodo is asked for this refund (by its reason)
    // before the claim is released; otherwise the plan would keep running on money already returned.
    const ours = sent
      ? await dodo()
          .payments.retrieve(remoteId)
          .then((payment) => payment.refunds.find((refund) => refund.reason === note && refund.status !== "failed"))
          .catch(() => undefined)
      : undefined;
    if (!ours) {
      await release();
      throw error;
    }
    refundId = ours.refund_id;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(payments)
      .set({ status: "refunded", refundedAmount: row.amount, providerRefundId: refundId })
      .where(eq(payments.id, row.id));
    if (subscription) {
      await tx
        .update(subscriptions)
        .set({ status: "expired", currentPeriodEnd: now, cancelledAt: subscription.cancelledAt ?? now })
        .where(eq(subscriptions.id, subscription.id));
    }
    await recomputePlan(userId, tx);
  });
  track(userId, "refund_requested", { amount_usd: row.amount / 100 });
  return { paymentId: row.id, refund: row.amount, currency: CURRENCY, providerRefundId: refundId };
}
