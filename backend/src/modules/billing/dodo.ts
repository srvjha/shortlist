import DodoPayments from "dodopayments";
import type { Payment } from "dodopayments/resources/payments";
import type { Refund } from "dodopayments/resources/refunds";
import type { Subscription } from "dodopayments/resources/subscriptions";
import { Webhook } from "standardwebhooks";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";

// In US cents. Dodo charges what its product says, so keep these in step with the products in the Dodo dashboard
// (src/scripts/dodo-products.ts creates them).
export const prices = { pro: 1_200, lifetime: 9_000 } as const;
export const CURRENCY = "USD" as const;
export type PaidPlan = keyof typeof prices;

// The Dodo business is shared with other products, whose webhooks reach us too. Every checkout here carries this tag.
export const APP = "shortlist";

const notConfigured = () => new AppError(503, "PAYMENTS_NOT_CONFIGURED", "Payments are not configured");

let client: DodoPayments | undefined;

export function dodo() {
  if (!env.DODO_PAYMENTS_API_KEY) throw notConfigured();
  client ??= new DodoPayments({
    bearerToken: env.DODO_PAYMENTS_API_KEY,
    webhookKey: env.DODO_PAYMENTS_WEBHOOK_KEY ?? null,
    environment: env.DODO_PAYMENTS_ENVIRONMENT,
  });
  return client;
}

export const dodoConfigured = () =>
  Boolean(env.DODO_PAYMENTS_API_KEY && env.DODO_PRODUCT_PRO && env.DODO_PRODUCT_LIFETIME);

export async function startCheckout(input: {
  checkoutId: string;
  userId: string;
  email: string;
  name: string;
  plan: PaidPlan;
}) {
  const productId = input.plan === "pro" ? env.DODO_PRODUCT_PRO : env.DODO_PRODUCT_LIFETIME;
  if (!productId) throw notConfigured();
  const session = await dodo().checkoutSessions.create({
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: { email: input.email, name: input.name || input.email },
    metadata: { app: APP, checkout: input.checkoutId, userId: input.userId, plan: input.plan },
    return_url: `${env.FRONTEND_URL}/billing?checkout=${input.checkoutId}`,
    cancel_url: `${env.FRONTEND_URL}/pricing`,
  });
  if (!session.checkout_url) throw new AppError(502, "CHECKOUT_FAILED", "The payment provider gave no checkout page");
  return { sessionId: session.session_id, url: session.checkout_url };
}

// A Dodo payment or subscription, translated so one handler (webhooks.ts) applies webhooks and return visits alike.
// `checkout` is our own subscription row id, from the metadata of the checkout that started it.
export type BillingEvent =
  | {
      type: "paid";
      checkoutSessionId: string | null;
      checkout: string | null;
      subscriptionId: string | null;
      paymentId: string;
      method: string | null;
    }
  | { type: "failed"; checkoutSessionId: string }
  | { type: "refunded"; paymentId: string; full: boolean }
  | {
      type: "subscription";
      subscriptionId: string;
      checkout: string | null;
      status: "active" | "cancelled" | "expired" | "past_due";
      periodStart: Date;
      periodEnd: Date;
    };

const checkoutOf = (metadata: Payment["metadata"] | null | undefined) =>
  metadata?.app === APP && typeof metadata.checkout === "string" ? metadata.checkout : null;

// Payments on a renewal may not repeat the checkout's metadata, so an untagged one is still looked at when it belongs
// to a subscription; webhooks.ts ignores any subscription that isn't ours.
export function paymentEvents(payment: Payment, outcome = payment.status): BillingEvent[] {
  const tag = payment.metadata?.app;
  if (tag ? tag !== APP : !payment.subscription_id) return [];
  if (outcome === "succeeded") {
    return [
      {
        type: "paid",
        checkoutSessionId: payment.checkout_session_id ?? null,
        checkout: checkoutOf(payment.metadata),
        subscriptionId: payment.subscription_id ?? null,
        paymentId: payment.payment_id,
        method: payment.payment_method_type ?? payment.payment_method ?? null,
      },
    ];
  }
  if ((outcome === "failed" || outcome === "cancelled") && payment.checkout_session_id) {
    return [{ type: "failed", checkoutSessionId: payment.checkout_session_id }];
  }
  return [];
}

const subscriptionStatus: Record<string, Extract<BillingEvent, { type: "subscription" }>["status"]> = {
  active: "active",
  renewed: "active",
  on_hold: "past_due",
  past_due: "past_due",
  cancelled: "cancelled",
  failed: "expired",
  expired: "expired",
};

export function subscriptionEvents(subscription: Subscription, state: string = subscription.status): BillingEvent[] {
  const tag = subscription.metadata?.app;
  const status = subscriptionStatus[state];
  if ((tag && tag !== APP) || !status) return [];
  return [
    {
      type: "subscription",
      subscriptionId: subscription.subscription_id,
      checkout: checkoutOf(subscription.metadata),
      status,
      periodStart: new Date(subscription.previous_billing_date),
      periodEnd: new Date(subscription.next_billing_date),
    },
  ];
}

export type DodoWebhook = { type?: string; data?: unknown };

export function dodoEvents({ type = "", data }: DodoWebhook): BillingEvent[] {
  if (!data) return [];
  const [kind, state] = type.split(".");
  if (kind === "payment") return paymentEvents(data as Payment, state as Payment["status"]);
  if (kind === "subscription") return subscriptionEvents(data as Subscription, state);
  if (type === "refund.succeeded") {
    const refund = data as Refund;
    const tag = refund.metadata?.app;
    // A refund made by hand in the dashboard has no tag; webhooks.ts ignores any payment that isn't ours.
    if (tag && tag !== APP) return [];
    return [{ type: "refunded", paymentId: refund.payment_id, full: !refund.is_partial }];
  }
  return [];
}

// Null when the signature is wrong. Throws when the key isn't set, so Dodo retries once it is.
export function readDodoWebhook(body: Buffer, headers: Record<string, string>): DodoWebhook | null {
  if (!env.DODO_PAYMENTS_WEBHOOK_KEY) throw notConfigured();
  const raw = body.toString("utf8");
  try {
    new Webhook(env.DODO_PAYMENTS_WEBHOOK_KEY).verify(raw, headers);
  } catch {
    return null;
  }
  return JSON.parse(raw) as DodoWebhook;
}
