import express, { Router } from "express";
import { AppError } from "../../lib/errors.js";
import { sendData } from "../../lib/http.js";
import { currentUser, requireAuth } from "../../middleware/require-auth.js";
import { publicLimiter } from "../../middleware/rate-limit.js";
import { validated } from "../../middleware/validate.js";
import {
  checkoutParams,
  checkoutResponse,
  createCheckoutBody,
  createRefundBody,
  pricingResponse,
  refundQuoteResponse,
  refundResponse,
  subscriptionResponse,
} from "./billing.schemas.js";
import * as service from "./billing.service.js";
import { dodoEvents, readDodoWebhook } from "./dodo.js";
import { confirmCheckout, handleEvents } from "./webhooks.js";

export const billingRouter = Router();

// Public: the prices of the plans for sale.
billingRouter.get("/pricing", publicLimiter, (_req, res) => {
  sendData(res, pricingResponse, service.pricing());
});

billingRouter.post(
  "/checkouts",
  requireAuth,
  ...validated({ body: createCheckoutBody }, async (req, res) => {
    sendData(res, checkoutResponse, await service.createCheckout(currentUser(req).id, req.body.plan), 201);
  }),
);

// The buyer is back from Dodo's page, so the plan switches on without waiting for the webhook. Nothing in the return
// URL is trusted: the state is read from Dodo.
billingRouter.post(
  "/checkouts/:checkoutId/confirmation",
  requireAuth,
  ...validated({ params: checkoutParams }, async (req, res) => {
    sendData(res, subscriptionResponse, await confirmCheckout(currentUser(req).id, req.params.checkoutId));
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
export const paymentWebhookRouter = Router();

paymentWebhookRouter.post("/v1/webhooks/dodo", express.raw({ type: "application/json", limit: "1mb" }), async (req, res) => {
  const body = req.body as Buffer;
  const event = Buffer.isBuffer(body)
    ? readDodoWebhook(body, {
        "webhook-id": req.get("webhook-id") ?? "",
        "webhook-signature": req.get("webhook-signature") ?? "",
        "webhook-timestamp": req.get("webhook-timestamp") ?? "",
      })
    : null;
  if (!event) throw new AppError(400, "INVALID_SIGNATURE", "Webhook signature verification failed");
  await handleEvents(req.get("webhook-id"), dodoEvents(event), event);
  res.status(200).json({ data: { received: true } });
});
