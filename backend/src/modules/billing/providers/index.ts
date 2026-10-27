import { polarProvider } from "./polar.js";
import { razorpayProvider } from "./razorpay.js";

export type PaidPlan = "season_pass" | "pro";
export type ProviderId = "razorpay" | "polar";

// A payment as the provider sees it, in the currency's minor unit. `fee` is null until the provider reports it.
export type Charge = { captured: boolean; amount: number; fee: number | null; refunded: number };

export type ProviderRefund = { id: string; amount: number };

// What the browser needs to finish paying: Razorpay opens its modal, Polar sends the buyer to its own page.
export type CheckoutClient =
  | { provider: "razorpay"; keyId: string; orderId: string | null; razorpaySubscriptionId: string | null }
  | { provider: "polar"; url: string };

// A provider's webhook, translated so one handler (webhooks.ts) applies every provider's events the same way.
export type BillingEvent =
  | { type: "paid"; checkoutId: string; paymentId: string; method: string | null; amount?: number }
  | { type: "failed"; checkoutId: string }
  | { type: "refunded"; paymentId: string; refunded: number }
  | {
      type: "subscription";
      subscriptionId: string;
      status: "active" | "cancelled" | "expired" | "past_due";
      periodStart: Date | null;
      periodEnd: Date | null;
      charge?: { paymentId: string; checkoutId: string; amount: number; method: string | null };
    };

export type PaymentProvider = {
  id: ProviderId;
  configured: () => boolean;
  // A one-time payment returns `checkoutId`; a recurring plan returns `subscriptionId` instead.
  startCheckout: (input: {
    userId: string;
    email: string;
    plan: PaidPlan;
    amount: number;
    currency: Currency;
  }) => Promise<{ checkoutId?: string; subscriptionId?: string; client: CheckoutClient }>;
  cancel: (subscriptionId: string, atPeriodEnd: boolean) => Promise<void>;
  charge: (paymentId: string) => Promise<Charge>;
  refund: (paymentId: string, amount: number, note: string) => Promise<ProviderRefund>;
  // A refund call that timed out may still have gone through; this finds it by the note it was sent with.
  findRefund: (paymentId: string, note: string) => Promise<ProviderRefund | undefined>;
};

export type Currency = "INR" | "USD";

const providers: Record<ProviderId, PaymentProvider> = { razorpay: razorpayProvider, polar: polarProvider };

export const providerOf = (id: ProviderId) => providers[id];

// Prices in the currency's minor unit.
const regions = {
  india: { currency: "INR", season_pass: 49_900, pro: 12_900 },
} as const;

// Which provider takes a payment from this visitor, and at what price.
export function routeFor(_country: string | null) {
  return { region: "india" as const, provider: providerOf("razorpay"), ...regions.india };
}
