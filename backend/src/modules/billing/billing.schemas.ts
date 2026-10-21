import { z } from "zod";

export const createCheckoutBody = z.object({ plan: z.enum(["season_pass", "pro"]) });

export const checkoutResponse = z.object({
  provider: z.literal("razorpay"),
  keyId: z.string(),
  plan: z.enum(["season_pass", "pro"]),
  // Season Pass is a one-time order; Pro is a recurring subscription.
  orderId: z.string().nullable(),
  razorpaySubscriptionId: z.string().nullable(),
  amountPaise: z.number().int(),
  currency: z.literal("INR"),
});

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
