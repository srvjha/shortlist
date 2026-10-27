import express, { type Request, Router } from "express";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";
import { countryOf } from "../../lib/geo.js";
import { sendData } from "../../lib/http.js";
import { verifyWebhookSignature } from "../../lib/razorpay.js";
import { currentUser, requireAuth } from "../../middleware/require-auth.js";
import { clientIp, publicLimiter } from "../../middleware/rate-limit.js";
import { validated } from "../../middleware/validate.js";
import {
  checkoutResponse,
  createCheckoutBody,
  createRefundBody,
  pricingResponse,
  refundQuoteResponse,
  refundResponse,
  subscriptionResponse,
} from "./billing.schemas.js";
import * as service from "./billing.service.js";
import { polarEvents, readPolarWebhook } from "./providers/polar.js";
import { razorpayEvents } from "./providers/razorpay.js";
import { handleEvents } from "./webhooks.js";

export const billingRouter = Router();

// Locally every request comes from localhost, so PAYMENTS_TEST_COUNTRY stands in for the visitor's country.
const visitorCountry = (req: Request) =>
  env.NODE_ENV !== "production" && env.PAYMENTS_TEST_COUNTRY ? env.PAYMENTS_TEST_COUNTRY : countryOf(clientIp(req));

// Public: the prices for the visitor's country. Pages rendered on the frontend's server pass the visitor's IP.
billingRouter.get("/pricing", publicLimiter, async (req, res) => {
  sendData(res, pricingResponse, service.pricingFor(await visitorCountry(req)));
});

billingRouter.post(
  "/checkouts",
  requireAuth,
  ...validated({ body: createCheckoutBody }, async (req, res) => {
    const country = await visitorCountry(req);
    sendData(res, checkoutResponse, await service.createCheckout(currentUser(req).id, req.body.plan, country), 201);
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

paymentWebhookRouter.post(
  "/v1/webhooks/razorpay",
  express.raw({ type: "application/json", limit: "1mb" }),
  async (req, res) => {
    const body = req.body as Buffer;
    if (!Buffer.isBuffer(body) || !verifyWebhookSignature(body, req.get("x-razorpay-signature"))) {
      throw new AppError(400, "INVALID_SIGNATURE", "Webhook signature verification failed");
    }
    const event = JSON.parse(body.toString("utf8"));
    await handleEvents("razorpay", req.get("x-razorpay-event-id"), razorpayEvents(event), event);
    res.status(200).json({ data: { received: true } });
  },
);

paymentWebhookRouter.post(
  "/v1/webhooks/polar",
  express.raw({ type: "application/json", limit: "1mb" }),
  async (req, res) => {
    const body = req.body as Buffer;
    const event = Buffer.isBuffer(body) ? await readPolarWebhook(body, req.headers as Record<string, string>) : null;
    if (!event) throw new AppError(400, "INVALID_SIGNATURE", "Webhook signature verification failed");
    if (event.type !== "unknown") await handleEvents("polar", req.get("webhook-id"), polarEvents(event), event);
    res.status(200).json({ data: { received: true } });
  },
);
