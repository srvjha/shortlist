import { createPolar, webhooks } from "@polar-sh/sdk/2026-10";
import { env } from "../../../config/env.js";
import { AppError } from "../../../lib/errors.js";
import type { BillingEvent, PaymentProvider } from "./index.js";

let client: ReturnType<typeof createPolar> | undefined;

function polar() {
  if (!env.POLAR_ACCESS_TOKEN) throw new AppError(503, "PAYMENTS_NOT_CONFIGURED", "Payments are not configured");
  client ??= createPolar({ accessToken: env.POLAR_ACCESS_TOKEN, environment: env.POLAR_SERVER });
  return client;
}

// Both plans are one-time purchases on Polar, so a payment here is a Polar order and nothing renews.
export const polarProvider: PaymentProvider = {
  id: "polar",
  configured: () => Boolean(env.POLAR_ACCESS_TOKEN && env.POLAR_SEASON_PASS_PRODUCT_ID && env.POLAR_PRO_PRODUCT_ID),

  async startCheckout({ userId, email, plan, currency }) {
    const productId = plan === "pro" ? env.POLAR_PRO_PRODUCT_ID : env.POLAR_SEASON_PASS_PRODUCT_ID;
    if (!productId) throw new AppError(503, "PAYMENTS_NOT_CONFIGURED", "Payments are not configured");
    const checkout = await polar().checkouts.create({
      products: [productId],
      // Set so the product's price in this currency is charged, not one picked from the buyer's IP.
      currency: currency === "USD" ? "usd" : "inr",
      external_customer_id: userId,
      customer_email: email,
      metadata: { userId, plan },
      success_url: `${env.FRONTEND_URL}/billing?checkout=done`,
      return_url: `${env.FRONTEND_URL}/pricing`,
    });
    return { checkoutId: checkout.id, client: { provider: "polar", url: checkout.url } };
  },

  async cancel() {
    throw new AppError(409, "NOT_RECURRING", "Plans bought through Polar don't renew, so there is nothing to cancel");
  },

  async charge(orderId) {
    const order = await polar().orders.get(orderId);
    // Polar works the fee out shortly after payment (0 until then), and keeps it in its own balance's currency.
    // ponytail: a fee in another currency than the order (an INR order on a USD balance) reads as unknown, so that
    // refund needs doing by hand in Polar. Convert with Polar's rate if India ever moves to Polar.
    const feeKnown =
      order.platform_fee_amount > 0 && order.platform_fee_currency?.toLowerCase() === order.currency.toLowerCase();
    // Refunds are sent without tax (Polar adds its share), so this is the amount before tax.
    return {
      captured: order.paid,
      amount: order.net_amount,
      fee: feeKnown ? order.platform_fee_amount : null,
      refunded: order.refunded_amount,
    };
  },

  async refund(orderId, amount, note) {
    const refund = await polar().refunds.create({
      order_id: orderId,
      amount,
      reason: "customer_request",
      metadata: { note },
    });
    return { id: refund.id, amount: refund.amount };
  },

  async findRefund(orderId, note) {
    const list = await polar().refunds.list({ order_id: orderId });
    const ours = list.items.find((refund) => refund.metadata.note === note);
    return ours && { id: ours.id, amount: ours.amount };
  },
};

// Null when the signature is wrong. Event types the SDK doesn't know yet are accepted and ignored.
export async function readPolarWebhook(body: Buffer, headers: Record<string, string>) {
  if (!env.POLAR_WEBHOOK_SECRET) return null;
  try {
    return await webhooks.validateEvent(body, headers, env.POLAR_WEBHOOK_SECRET);
  } catch (error) {
    if (error instanceof webhooks.PolarWebhookUnknownTypeError) return { type: "unknown" as const };
    if (error instanceof webhooks.PolarWebhookVerificationError) return null;
    throw error;
  }
}

export function polarEvents(payload: NonNullable<Awaited<ReturnType<typeof readPolarWebhook>>>): BillingEvent[] {
  switch (payload.type) {
    case "order.paid": {
      const order = payload.data;
      return order.checkout_id
        ? [
            {
              type: "paid",
              checkoutId: order.checkout_id,
              paymentId: order.id,
              method: null,
              amount: order.total_amount,
            },
          ]
        : [];
    }
    case "order.refunded": {
      const order = payload.data;
      // Compared with the amount charged, which includes tax.
      return [{ type: "refunded", paymentId: order.id, refunded: order.refunded_amount + order.refunded_tax_amount }];
    }
    case "checkout.updated":
      return payload.data.status === "failed" ? [{ type: "failed", checkoutId: payload.data.id }] : [];
    default:
      return [];
  }
}
