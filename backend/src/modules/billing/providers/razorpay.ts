import { env } from "../../../config/env.js";
import { AppError } from "../../../lib/errors.js";
import { razorpay } from "../../../lib/razorpay.js";
import type { BillingEvent, PaymentProvider } from "./index.js";

type RemotePayment = { amount: number; status: string; fee?: number | null; amount_refunded?: number };
type RemoteRefund = { id: string; amount: number; notes?: { reason?: string } };

// Season Pass is a one-time order; Pro is a Razorpay subscription that charges every month.
export const razorpayProvider: PaymentProvider = {
  id: "razorpay",
  configured: () => Boolean(env.RAZORPAY_KEY_ID),

  async startCheckout({ userId, plan, amount, currency }) {
    const keyId = env.RAZORPAY_KEY_ID;
    if (!keyId) throw new AppError(503, "PAYMENTS_NOT_CONFIGURED", "Payments are not configured");
    if (plan === "season_pass") {
      const order = await razorpay<{ id: string }>("POST", "/orders", {
        amount,
        currency,
        receipt: `sp_${Date.now()}`,
        notes: { userId, plan },
      });
      return {
        checkoutId: order.id,
        client: { provider: "razorpay", keyId, orderId: order.id, razorpaySubscriptionId: null },
      };
    }
    if (!env.RAZORPAY_PRO_PLAN_ID) throw new AppError(503, "PAYMENTS_NOT_CONFIGURED", "The Pro plan is not configured");
    const remote = await razorpay<{ id: string }>("POST", "/subscriptions", {
      plan_id: env.RAZORPAY_PRO_PLAN_ID,
      total_count: 120,
      customer_notify: 1,
      notes: { userId, plan },
    });
    return {
      subscriptionId: remote.id,
      client: { provider: "razorpay", keyId, orderId: null, razorpaySubscriptionId: remote.id },
    };
  },

  async cancel(subscriptionId, atPeriodEnd) {
    await razorpay("POST", `/subscriptions/${subscriptionId}/cancel`, { cancel_at_cycle_end: atPeriodEnd ? 1 : 0 });
  },

  async charge(paymentId) {
    const remote = await razorpay<RemotePayment>("GET", `/payments/${paymentId}`);
    // `fee` already includes the GST on it.
    return {
      captured: remote.status === "captured",
      amount: remote.amount,
      fee: typeof remote.fee === "number" ? remote.fee : null,
      refunded: remote.amount_refunded ?? 0,
    };
  },

  async refund(paymentId, amount, note) {
    const refund = await razorpay<RemoteRefund>("POST", `/payments/${paymentId}/refund`, {
      amount,
      speed: "normal",
      notes: { reason: note },
    });
    return { id: refund.id, amount: refund.amount };
  },

  async findRefund(paymentId, note) {
    const list = await razorpay<{ items?: RemoteRefund[] }>("GET", `/payments/${paymentId}/refunds`);
    const ours = list.items?.find((item) => item.notes?.reason === note);
    return ours && { id: ours.id, amount: ours.amount };
  },
};

type Entity = Record<string, unknown> & { id: string };
export type RazorpayEvent = {
  event: string;
  payload: {
    payment?: { entity: Entity & { order_id?: string; method?: string; amount?: number; amount_refunded?: number } };
    subscription?: { entity: Entity & { current_start?: number; current_end?: number } };
    refund?: { entity: Entity & { payment_id?: string; amount?: number } };
  };
};

const fromUnix = (seconds?: number) => (seconds ? new Date(seconds * 1000) : null);

const subscriptionStatus = {
  "subscription.activated": "active",
  "subscription.charged": "active",
  "subscription.cancelled": "cancelled",
  "subscription.completed": "expired",
  "subscription.halted": "past_due",
} as const;

export function razorpayEvents(event: RazorpayEvent): BillingEvent[] {
  const { payment, subscription, refund } = event.payload;
  switch (event.event) {
    case "payment.captured":
      return payment?.entity.order_id
        ? [
            {
              type: "paid",
              checkoutId: payment.entity.order_id,
              paymentId: payment.entity.id,
              method: payment.entity.method ?? null,
            },
          ]
        : [];
    case "payment.failed":
      return payment?.entity.order_id ? [{ type: "failed", checkoutId: payment.entity.order_id }] : [];
    case "refund.processed":
      // Several partial refunds can add up to the full amount, which the payment's running total shows.
      return refund?.entity.payment_id
        ? [
            {
              type: "refunded",
              paymentId: refund.entity.payment_id,
              refunded: payment?.entity.amount_refunded ?? refund.entity.amount ?? 0,
            },
          ]
        : [];
    case "subscription.activated":
    case "subscription.charged":
    case "subscription.cancelled":
    case "subscription.completed":
    case "subscription.halted": {
      if (!subscription) return [];
      const remote = subscription.entity;
      const charged = event.event === "subscription.charged" && payment;
      return [
        {
          type: "subscription",
          subscriptionId: remote.id,
          status: subscriptionStatus[event.event],
          periodStart: fromUnix(remote.current_start),
          periodEnd: fromUnix(remote.current_end),
          ...(charged && {
            charge: {
              paymentId: payment.entity.id,
              checkoutId: payment.entity.order_id ?? remote.id,
              amount: payment.entity.amount ?? 0,
              method: payment.entity.method ?? null,
            },
          }),
        },
      ];
    }
    default:
      return [];
  }
}
