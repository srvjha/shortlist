import { z } from "zod";

const paidPlan = z.enum(["pro", "lifetime"]);
// Season Passes are no longer sold, but people may still hold one.
const heldPlan = z.enum(["season_pass", "pro", "lifetime"]);

export const createCheckoutBody = z.object({ plan: paidPlan });

// The plans for sale, in US cents.
export const pricingResponse = z.object({
  currency: z.literal("USD"),
  pro: z.number().int(),
  lifetime: z.number().int(),
});

// `url` is Dodo's hosted checkout page; it sends the buyer back to /billing?checkout=<checkoutId>.
export const checkoutResponse = z.object({
  checkoutId: z.uuid(),
  url: z.url(),
  plan: paidPlan,
  amount: z.number().int(),
  currency: z.literal("USD"),
});

export const checkoutParams = z.object({ checkoutId: z.uuid() });

export const subscriptionResponse = z.object({
  plan: z.enum(["free", "season_pass", "pro", "lifetime"]),
  subscription: z
    .object({
      id: z.uuid(),
      plan: heldPlan,
      status: z.enum(["created", "active", "past_due", "cancelled", "expired"]),
      currentPeriodEnd: z.date().nullable(),
      cancelledAt: z.date().nullable(),
      renews: z.boolean(),
    })
    .nullable(),
});

export const refundQuoteResponse = z.object({
  // Null when no payment is still inside its 7 day refund window, or when `reason` says why it can't be refunded.
  quote: z
    .object({
      paymentId: z.uuid(),
      plan: heldPlan.nullable(),
      currency: z.literal("USD"),
      // The full price paid, in US cents. Any tax paid goes back with it.
      refund: z.number().int(),
      refundableUntil: z.date(),
    })
    .nullable(),
  reason: z.string().nullable(),
});

export const createRefundBody = z.object({ paymentId: z.uuid() });

export const refundResponse = z.object({
  paymentId: z.uuid(),
  refund: z.number().int(),
  currency: z.literal("USD"),
  providerRefundId: z.string(),
});
