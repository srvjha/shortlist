import { z } from "zod";

export const createCheckoutBody = z.object({ plan: z.enum(["season_pass", "pro"]) });

// The prices for the visitor's country, in the currency's minor unit. With Razorpay, Pro renews monthly; with Polar,
// both plans are one payment.
export const pricingResponse = z.object({
  region: z.enum(["india", "global"]),
  country: z.string().nullable(),
  provider: z.enum(["razorpay", "polar"]),
  currency: z.enum(["INR", "USD"]),
  season_pass: z.number().int(),
  pro: z.number().int(),
});

const checkoutBase = {
  plan: z.enum(["season_pass", "pro"]),
  // In the currency's minor unit (paise, cents).
  amount: z.number().int(),
  currency: z.enum(["INR", "USD"]),
};

// Razorpay opens its modal on the page; Polar sends the buyer to its own checkout page.
export const checkoutResponse = z.discriminatedUnion("provider", [
  z.object({
    ...checkoutBase,
    provider: z.literal("razorpay"),
    keyId: z.string(),
    // Season Pass is a one-time order; Pro is a recurring subscription.
    orderId: z.string().nullable(),
    razorpaySubscriptionId: z.string().nullable(),
  }),
  z.object({ ...checkoutBase, provider: z.literal("polar"), url: z.url() }),
]);

export const subscriptionResponse = z.object({
  plan: z.enum(["free", "season_pass", "pro"]),
  subscription: z
    .object({
      id: z.uuid(),
      plan: z.enum(["season_pass", "pro"]),
      status: z.enum(["created", "active", "past_due", "cancelled", "expired"]),
      currentPeriodEnd: z.date().nullable(),
      cancelledAt: z.date().nullable(),
    })
    .nullable(),
});

export const refundQuoteResponse = z.object({
  // Null when no payment is still inside its 6 hour refund window, or when `reason` says why it can't be refunded.
  quote: z
    .object({
      paymentId: z.uuid(),
      plan: z.enum(["season_pass", "pro"]).nullable(),
      amountPaidPaise: z.number().int(),
      feePaise: z.number().int(),
      refundPaise: z.number().int(),
      refundableUntil: z.date(),
    })
    .nullable(),
  reason: z.string().nullable(),
});

export const createRefundBody = z.object({ paymentId: z.uuid() });

export const refundResponse = z.object({
  paymentId: z.uuid(),
  refundPaise: z.number().int(),
  razorpayRefundId: z.string(),
});
