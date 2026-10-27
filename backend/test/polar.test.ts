import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

const secret = "whsec_dGVzdC1zZWNyZXQ=";
const orders = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../src/config/env.js", async (original) => ({
  env: {
    ...(await original<typeof import("../src/config/env.js")>()).env,
    POLAR_ACCESS_TOKEN: "polar_test",
    POLAR_WEBHOOK_SECRET: "whsec_dGVzdC1zZWNyZXQ=",
  },
}));
vi.mock("@polar-sh/sdk/2026-10", async (original) => ({
  ...(await original<typeof import("@polar-sh/sdk/2026-10")>()),
  createPolar: () => ({ orders }),
}));

import { polarEvents, polarProvider, readPolarWebhook } from "../src/modules/billing/providers/polar.js";

// Signed the way Polar signs deliveries (Standard Webhooks).
function delivery(payload: unknown, signWith = secret) {
  const body = JSON.stringify(payload);
  const id = "msg_1";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const key = Buffer.from(signWith.slice("whsec_".length), "base64");
  const signature = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
  return {
    body: Buffer.from(body),
    headers: { "webhook-id": id, "webhook-timestamp": timestamp, "webhook-signature": `v1,${signature}` },
  };
}

const order = {
  id: "order_1",
  checkout_id: "co_1",
  paid: true,
  currency: "usd",
  net_amount: 900,
  total_amount: 972,
  refunded_amount: 0,
  refunded_tax_amount: 0,
  platform_fee_amount: 0,
  platform_fee_currency: null,
};

describe("Polar webhooks", () => {
  it("turns a signed order.paid into a payment against our checkout, at the amount charged with tax", async () => {
    const { body, headers } = delivery({ type: "order.paid", data: order });
    const event = await readPolarWebhook(body, headers);
    expect(polarEvents(event!)).toEqual([
      { type: "paid", checkoutId: "co_1", paymentId: "order_1", method: null, amount: 972 },
    ]);
  });

  it("rejects a delivery signed with another secret", async () => {
    const { body, headers } = delivery({ type: "order.paid", data: order }, "whsec_b3RoZXI=");
    expect(await readPolarWebhook(body, headers)).toBeNull();
  });

  it("accepts and ignores event types it doesn't know", async () => {
    const { body, headers } = delivery({ type: "something.new", data: {} });
    expect(await readPolarWebhook(body, headers)).toEqual({ type: "unknown" });
  });

  it("counts tax in the refunded total, so a full refund matches the amount charged", async () => {
    const { body, headers } = delivery({
      type: "order.refunded",
      data: { ...order, refunded_amount: 900, refunded_tax_amount: 72 },
    });
    expect(polarEvents((await readPolarWebhook(body, headers))!)).toEqual([
      { type: "refunded", paymentId: "order_1", refunded: 972 },
    ]);
  });
});

describe("Polar refunds", () => {
  it("treats the fee as unknown until Polar has worked it out", async () => {
    orders.get.mockResolvedValueOnce(order);
    await expect(polarProvider.charge("order_1")).resolves.toMatchObject({ fee: null });
  });

  it("refunds the amount before tax, less Polar's fee", async () => {
    orders.get.mockResolvedValueOnce({ ...order, platform_fee_amount: 109, platform_fee_currency: "usd" });
    await expect(polarProvider.charge("order_1")).resolves.toEqual({
      captured: true,
      amount: 900,
      fee: 109,
      refunded: 0,
    });
  });

  it("won't subtract a fee kept in another currency", async () => {
    orders.get.mockResolvedValueOnce({
      ...order,
      currency: "inr",
      platform_fee_amount: 120,
      platform_fee_currency: "usd",
    });
    await expect(polarProvider.charge("order_1")).resolves.toMatchObject({ fee: null });
  });
});
