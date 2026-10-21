import express, { Router } from "express";
import { AppError } from "../../lib/errors.js";
import { sendData } from "../../lib/http.js";
import { verifyWebhookSignature } from "../../lib/razorpay.js";
import { currentUser, requireAuth } from "../../middleware/require-auth.js";
import { validated } from "../../middleware/validate.js";
import {
  checkoutResponse,
  createCheckoutBody,
  createRefundBody,
  refundQuoteResponse,
  refundResponse,
  subscriptionResponse,
} from "./billing.schemas.js";
import * as service from "./billing.service.js";
import { handleRazorpayEvent } from "./webhooks.js";

export const billingRouter = Router();

billingRouter.post(
  "/checkouts",
  requireAuth,
  ...validated({ body: createCheckoutBody }, async (req, res) => {
    sendData(res, checkoutResponse, await service.createCheckout(currentUser(req).id, req.body.plan), 201);
  }),
);

billingRouter.get("/subscription", requireAuth, async (req, res) => {
  sendData(res, subscriptionResponse, await service.getSubscription(currentUser(req).id));
});

billingRouter.delete("/subscription", requireAuth, async (req, res) => {
  sendData(res, subscriptionResponse, await service.cancelSubscription(currentUser(req).id));
});

billingRouter.get("/refunds/quote", requireAuth, async (req, res) => {
  sendData(res, refundQuoteResponse, await service.getRefundQuote(currentUser(req).id));
});

billingRouter.post(
  "/refunds",
  requireAuth,
  ...validated({ body: createRefundBody }, async (req, res) => {
    sendData(res, refundResponse, await service.requestRefund(currentUser(req).id, req.body.paymentId), 201);
  }),
);

// Mounted before express.json() in app.ts: the signature is computed over the raw body.
export const razorpayWebhookRouter = Router();

razorpayWebhookRouter.post(
  "/v1/webhooks/razorpay",
  express.raw({ type: "application/json", limit: "1mb" }),
  async (req, res) => {
    const body = req.body as Buffer;
    if (!Buffer.isBuffer(body) || !verifyWebhookSignature(body, req.get("x-razorpay-signature"))) {
      throw new AppError(400, "INVALID_SIGNATURE", "Webhook signature verification failed");
    }
    await handleRazorpayEvent(JSON.parse(body.toString("utf8")), req.get("x-razorpay-event-id"));
    res.status(200).json({ data: { received: true } });
  },
);
