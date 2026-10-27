import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({}) as Record<string, string | undefined>);
vi.mock("../src/config/env.js", async (original) => {
  const real = (await original<typeof import("../src/config/env.js")>()).env;
  return { env: new Proxy(real, { get: (target, key: string) => (key in env ? env[key] : target[key as never]) }) };
});

import { pricingFor } from "../src/modules/billing/billing.service.js";

const polarSetUp = {
  POLAR_ACCESS_TOKEN: "polar_test",
  POLAR_SEASON_PASS_PRODUCT_ID: "prod_sp",
  POLAR_PRO_PRODUCT_ID: "prod_pro",
};

beforeEach(() => {
  for (const key of Object.keys(env)) delete env[key];
  Object.assign(env, polarSetUp, { PAYMENTS_INDIA: "razorpay" });
});

describe("payment routing", () => {
  it("sends India, and any country it can't tell, to Razorpay in rupees", () => {
    for (const country of ["IN", null]) {
      expect(pricingFor(country)).toMatchObject({ provider: "razorpay", currency: "INR", season_pass: 49_900 });
    }
  });

  it("sends everyone else to Polar in dollars", () => {
    expect(pricingFor("US")).toMatchObject({ provider: "polar", currency: "USD", season_pass: 900, pro: 400 });
  });

  it("keeps everyone on Razorpay until Polar is set up", () => {
    env.POLAR_PRO_PRODUCT_ID = undefined;
    expect(pricingFor("US")).toMatchObject({ provider: "razorpay", currency: "INR" });
  });

  it("can move India to Polar, still in rupees", () => {
    env.PAYMENTS_INDIA = "polar";
    expect(pricingFor("IN")).toMatchObject({ provider: "polar", currency: "INR", season_pass: 49_900 });
  });
});
