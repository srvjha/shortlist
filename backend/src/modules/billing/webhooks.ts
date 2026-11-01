import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { db } from "../../db/index.js";
import { payments, subscriptions, webhookEvents } from "../../db/schema/index.js";
import { logger } from "../../lib/logger.js";
import { recomputePlan } from "./billing.service.js";
import { track } from "../../lib/analytics.js";
import type { BillingEvent, ProviderId } from "./providers/index.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// How long a one-time payment buys: Season Pass anywhere, or a single Pro month on Polar.
const MONTHS = { season_pass: 6, pro: 1 } as const;

// Providers retry deliveries; each event id is processed once. Recorded in the same transaction as the
// event's effects, so a failure rolls both back and the retry runs it again.
async function firstDelivery(tx: Tx, provider: ProviderId, eventId: string | undefined) {
  if (!eventId) return true;
  const inserted = await tx
    .insert(webhookEvents)
    .values({ id: `${provider}:${eventId}` })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id });
  return inserted.length > 0;
}

async function onPaid(tx: Tx, event: Extract<BillingEvent, { type: "paid" }>, raw: unknown) {
  const [row] = await tx.select().from(payments).where(eq(payments.providerCheckoutId, event.checkoutId)).limit(1);
  if (!row || row.status === "captured") return null;

  await tx
    .update(payments)
    .set({
      status: "captured",
      capturedAt: new Date(),
      providerPaymentId: event.paymentId,
      method: event.method,
      ...(event.amount !== undefined && { amount: event.amount }),
      raw,
    })
    .where(eq(payments.id, row.id));

  const [bought] = row.subscriptionId
    ? await tx.select({ plan: subscriptions.plan }).from(subscriptions).where(eq(subscriptions.id, row.subscriptionId))
    : [];
  if (row.subscriptionId && bought) {
    // A new pass extends the latest-ending current one of the same plan.
    const [current] = await tx
      .select({ end: subscriptions.currentPeriodEnd })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, row.userId),
          eq(subscriptions.plan, bought.plan),
          eq(subscriptions.status, "active"),
        ),
      )
      .orderBy(desc(subscriptions.currentPeriodEnd))
      .limit(1);
    const start = current?.end && current.end > new Date() ? current.end : new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + MONTHS[bought.plan]);
    await tx
      .update(subscriptions)
      .set({ status: "active", currentPeriodStart: start, currentPeriodEnd: end })
      .where(eq(subscriptions.id, row.subscriptionId));
  }
  await recomputePlan(row.userId, tx);
  const amount = event.amount ?? row.amount;
  // Keeps the property name `amount_inr` that existing dashboards read.
  return () => track(row.userId, "payment_captured", { [`amount_${row.currency.toLowerCase()}`]: amount / 100 });
}

async function onSubscription(
  tx: Tx,
  provider: ProviderId,
  event: Extract<BillingEvent, { type: "subscription" }>,
  raw: unknown,
) {
  const [row] = await tx
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.providerSubscriptionId, event.subscriptionId))
    .limit(1);
  if (!row) {
    logger.warn({ subscriptionId: event.subscriptionId }, "Webhook for unknown subscription");
    return;
  }
  // Ended for good (completed, or refunded and cancelled here); a late cancelled event must not revive it.
  if (row.status === "expired") return;

  await tx
    .update(subscriptions)
    .set({
      status: event.status,
      currentPeriodStart: event.periodStart ?? row.currentPeriodStart,
      currentPeriodEnd: event.periodEnd ?? row.currentPeriodEnd,
      ...(event.status === "cancelled" && !row.cancelledAt && { cancelledAt: new Date() }),
    })
    .where(eq(subscriptions.id, row.id));

  if (event.charge) {
    await tx
      .insert(payments)
      .values({
        userId: row.userId,
        subscriptionId: row.id,
        provider,
        providerCheckoutId: event.charge.checkoutId,
        providerPaymentId: event.charge.paymentId,
        amount: event.charge.amount,
        status: "captured",
        capturedAt: new Date(),
        method: event.charge.method,
        raw,
      })
      .onConflictDoNothing({ target: payments.providerPaymentId });
  }
  await recomputePlan(row.userId, tx);
}

// A full refund ends the one-time pass it paid for straight away; a partial one (a goodwill credit) changes nothing.
// Self-serve refunds (requestRefund) are partial and end the plan themselves, so this is a no-op for them.
// A recurring Pro is left alone: it is cancelled at the provider for a refund, and that event ends it.
async function onRefund(tx: Tx, event: Extract<BillingEvent, { type: "refunded" }>) {
  const [row] = await tx.select().from(payments).where(eq(payments.providerPaymentId, event.paymentId)).limit(1);
  if (!row || event.refunded < row.amount) return;

  await tx.update(payments).set({ status: "refunded" }).where(eq(payments.id, row.id));
  if (!row.subscriptionId) return;
  // ponytail: a pass stacked after this one keeps its later end date, so refunding the earlier of two stacked
  // passes leaves its remaining time on the user. Shift later passes back by the refunded time if that matters.
  await tx
    .update(subscriptions)
    .set({ status: "expired", currentPeriodEnd: new Date() })
    .where(and(eq(subscriptions.id, row.subscriptionId), isNull(subscriptions.providerSubscriptionId)));
  await recomputePlan(row.userId, tx);
}

async function apply(tx: Tx, provider: ProviderId, event: BillingEvent, raw: unknown) {
  switch (event.type) {
    case "paid":
      return onPaid(tx, event, raw);
    case "failed":
      await tx
        .update(payments)
        .set({ status: "failed", raw })
        // Retries share a checkout, and the provider may deliver an earlier failure after the capture.
        .where(and(eq(payments.providerCheckoutId, event.checkoutId), ne(payments.status, "captured")));
      return null;
    case "refunded":
      await onRefund(tx, event);
      return null;
    case "subscription":
      await onSubscription(tx, provider, event, raw);
      return null;
  }
}

export async function handleEvents(
  provider: ProviderId,
  eventId: string | undefined,
  events: BillingEvent[],
  raw: unknown,
) {
  if (events.length === 0) {
    logger.info({ provider, eventId }, "Ignored payment webhook");
    return;
  }
  // Analytics run only after the transaction commits, so a rolled-back event is never counted.
  const afterCommit = await db.transaction(async (tx) => {
    if (!(await firstDelivery(tx, provider, eventId))) return [];
    const done = [];
    for (const event of events) done.push(await apply(tx, provider, event, raw));
    return done;
  });
  for (const run of afterCommit) run?.();
}
