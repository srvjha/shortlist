import { and, asc, eq, inArray, isNull, ne } from "drizzle-orm";
import { db } from "../../db/index.js";
import { payments, subscriptions, webhookEvents } from "../../db/schema/index.js";
import { NotFoundError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { cancelSubscription, getSubscription, recomputePlan } from "./billing.service.js";
import { captureError, track } from "../../lib/analytics.js";
import { type BillingEvent, CURRENCY, dodo, paymentEvents, prices, subscriptionEvents } from "./dodo.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const LIFETIME_MONTHS = 1200;

// Dodo retries deliveries; each event id is processed once. Recorded in the same transaction as the event's effects,
// so a failure rolls both back and the retry runs it again.
async function firstDelivery(tx: Tx, eventId: string | undefined) {
  if (!eventId) return true;
  const inserted = await tx
    .insert(webhookEvents)
    .values({ id: `dodo:${eventId}` })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id });
  return inserted.length > 0;
}

const monthsFrom = (start: Date, months: number) => {
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  return end;
};

// The subscription row a Dodo payment belongs to: named by the checkout's metadata or session, or by Dodo's
// subscription id on a renewal. None means it's some other product's payment.
async function rowOfPayment(tx: Tx, event: Extract<BillingEvent, { type: "paid" }>) {
  const [started] =
    !event.checkout && event.checkoutSessionId
      ? await tx
          .select({ subscriptionId: payments.subscriptionId })
          .from(payments)
          .where(eq(payments.providerCheckoutId, event.checkoutSessionId))
          .limit(1)
      : [];
  const id = event.checkout ?? started?.subscriptionId;
  if (id) {
    const [row] = await tx.select().from(subscriptions).where(eq(subscriptions.id, id)).limit(1);
    return row;
  }
  if (!event.subscriptionId) return undefined;
  const [row] = await tx
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.providerSubscriptionId, event.subscriptionId))
    .limit(1);
  return row;
}

async function stopRunningPro(userId: string) {
  await cancelSubscription(userId).catch((err: unknown) => {
    if (!(err instanceof NotFoundError)) logger.error({ err, userId }, "Could not cancel Basic after buying Pro");
  });
}

async function onPaid(tx: Tx, event: Extract<BillingEvent, { type: "paid" }>, raw: unknown) {
  const subscription = await rowOfPayment(tx, event);
  if (!subscription) {
    logger.info({ paymentId: event.paymentId }, "Ignored a payment that isn't ours");
    return null;
  }
  const now = new Date();
  // Retries share a checkout, so a failed first attempt can still be the one that gets paid.
  const [first] = await tx
    .select()
    .from(payments)
    .where(and(eq(payments.subscriptionId, subscription.id), inArray(payments.status, ["created", "failed"])))
    .orderBy(asc(payments.createdAt))
    .limit(1);
  const amount = event.amount ?? first?.amount ?? prices[subscription.plan === "lifetime" ? "lifetime" : "pro"];

  if (first) {
    await tx
      .update(payments)
      .set({
        status: "captured",
        capturedAt: now,
        providerPaymentId: event.paymentId,
        method: event.method,
        amount,
        raw,
      })
      .where(eq(payments.id, first.id));
  } else {
    // A later charge on the subscription, or a repeat of one already recorded (which this leaves alone).
    const added = await tx
      .insert(payments)
      .values({
        userId: subscription.userId,
        subscriptionId: subscription.id,
        provider: "dodo",
        providerCheckoutId: event.checkoutSessionId ?? event.subscriptionId ?? event.paymentId,
        providerPaymentId: event.paymentId,
        amount,
        currency: CURRENCY,
        status: "captured",
        capturedAt: now,
        method: event.method,
        raw,
      })
      .onConflictDoNothing({ target: payments.providerPaymentId })
      .returning({ id: payments.id });
    if (added.length === 0) return null;
  }

  const lifetime = subscription.plan === "lifetime";
  // Basic's real dates come from its subscription event, which may arrive before or after this payment.
  const starting = subscription.status === "created";
  if (starting || event.subscriptionId) {
    await tx
      .update(subscriptions)
      .set({
        ...(event.subscriptionId && { providerSubscriptionId: event.subscriptionId }),
        ...(starting && {
          status: "active" as const,
          currentPeriodStart: now,
          currentPeriodEnd: monthsFrom(now, lifetime ? LIFETIME_MONTHS : 1),
        }),
      })
      .where(eq(subscriptions.id, subscription.id));
  }
  await recomputePlan(subscription.userId, tx);

  return () => {
    track(subscription.userId, "payment_captured", { amount_usd: amount / 100 });
    // Pro replaces a running Basic, which would otherwise keep charging every month.
    if (lifetime && starting) void stopRunningPro(subscription.userId);
  };
}

async function onSubscription(tx: Tx, event: Extract<BillingEvent, { type: "subscription" }>) {
  const [known] = await tx
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.providerSubscriptionId, event.subscriptionId))
    .limit(1);
  const [started] =
    !known && event.checkout
      ? await tx.select().from(subscriptions).where(eq(subscriptions.id, event.checkout)).limit(1)
      : [];
  const row = known ?? started;
  if (!row) {
    logger.warn({ subscriptionId: event.subscriptionId }, "Webhook for unknown subscription");
    return;
  }
  // Ended for good (completed, or refunded and cancelled here); a late cancelled event must not revive it.
  if (row.status === "expired") return;

  await tx
    .update(subscriptions)
    .set({
      providerSubscriptionId: event.subscriptionId,
      // Cancelled here at the period's end; an earlier active event delivered late doesn't undo that.
      status: row.cancelledAt && event.status === "active" ? "cancelled" : event.status,
      currentPeriodStart: event.periodStart,
      currentPeriodEnd: event.periodEnd,
      ...(event.status === "cancelled" && !row.cancelledAt && { cancelledAt: new Date() }),
    })
    .where(eq(subscriptions.id, row.id));
  await recomputePlan(row.userId, tx);
}

// A full refund ends the one-time plan it paid for straight away; a partial one (a goodwill credit) changes nothing.
// Self-serve refunds (requestRefund) end the plan themselves, so this is a no-op for them.
// A recurring Basic is left alone: it is cancelled at Dodo for a refund, and that event ends it.
async function onRefund(tx: Tx, event: Extract<BillingEvent, { type: "refunded" }>) {
  const [row] = await tx.select().from(payments).where(eq(payments.providerPaymentId, event.paymentId)).limit(1);
  // A self-serve refund has already ended its plan here.
  if (!row || !event.full || row.status === "refunded") return;

  // A self-serve request Dodo couldn't pay (refundedAt set, see refundByHand) ends its plan even though it renews
  // through Dodo; other renewing plans are left to their subscription events.
  const requested = row.refundedAt !== null;
  await tx
    .update(payments)
    .set({ status: "refunded", ...(requested && { refundedAmount: row.amount }) })
    .where(eq(payments.id, row.id));
  if (!row.subscriptionId) return;
  await tx
    .update(subscriptions)
    .set({ status: "expired", currentPeriodEnd: new Date() })
    .where(
      and(
        eq(subscriptions.id, row.subscriptionId),
        requested ? undefined : isNull(subscriptions.providerSubscriptionId),
      ),
    );
  await recomputePlan(row.userId, tx);
}

// ponytail: this only tells an admin (Admin > API errors in PostHog, and the payload on the payment row). The user
// has already lost the plan to the refund claim, so someone has to retry the refund in Dodo or give the plan back by
// hand. Reopen the claim and restore the plan here if refunds ever fail more than rarely.
async function onRefundFailed(tx: Tx, event: Extract<BillingEvent, { type: "refund_failed" }>, raw: unknown) {
  const [row] = await tx
    .update(payments)
    .set({ raw })
    .where(eq(payments.providerPaymentId, event.paymentId))
    .returning({
      id: payments.id,
      userId: payments.userId,
    });
  if (!row) return null;
  const details = { paymentId: row.id, refundId: event.refundId };
  logger.error(details, "Dodo failed a refund");
  return () => captureError(new Error("Dodo failed a refund"), { ...details, user_id: row.userId });
}

async function apply(tx: Tx, event: BillingEvent, raw: unknown) {
  switch (event.type) {
    case "paid":
      return onPaid(tx, event, raw);
    case "failed":
      await tx
        .update(payments)
        .set({ status: "failed", raw })
        // Retries share a checkout, and Dodo may deliver an earlier failure after the capture.
        .where(and(eq(payments.providerCheckoutId, event.checkoutSessionId), ne(payments.status, "captured")));
      return null;
    case "refunded":
      await onRefund(tx, event);
      return null;
    case "refund_failed":
      return onRefundFailed(tx, event, raw);
    case "subscription":
      await onSubscription(tx, event);
      return null;
  }
}

export async function handleEvents(eventId: string | undefined, events: BillingEvent[], raw: unknown) {
  if (events.length === 0) {
    logger.info({ eventId }, "Ignored payment webhook");
    return;
  }
  // Analytics run only after the transaction commits, so a rolled-back event is never counted.
  const afterCommit = await db.transaction(async (tx) => {
    if (!(await firstDelivery(tx, eventId))) return [];
    const done = [];
    for (const event of events) done.push(await apply(tx, event, raw));
    return done;
  });
  for (const run of afterCommit) run?.();
}

// The buyer's return from Dodo's page. Reads the payment from Dodo through the session we stored, so nothing in the
// return URL counts, and applies it the way a webhook would; whichever comes first does the work.
export async function confirmCheckout(userId: string, checkoutId: string) {
  const [row] = await db
    .select({ sessionId: payments.providerCheckoutId })
    .from(payments)
    .innerJoin(subscriptions, eq(subscriptions.id, payments.subscriptionId))
    .where(and(eq(subscriptions.id, checkoutId), eq(subscriptions.userId, userId), eq(payments.provider, "dodo")))
    .limit(1);
  if (!row) throw new NotFoundError("Checkout");
  const session = await dodo().checkoutSessions.retrieve(row.sessionId);
  if (session.payment_id) {
    const payment = await dodo().payments.retrieve(session.payment_id);
    const events = paymentEvents(payment);
    if (payment.status === "succeeded" && payment.subscription_id) {
      events.push(...subscriptionEvents(await dodo().subscriptions.retrieve(payment.subscription_id)));
    }
    await handleEvents(undefined, events, payment);
  }
  return getSubscription(userId);
}
