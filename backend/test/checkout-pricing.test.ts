import { beforeEach, describe, expect, it, vi } from "vitest";

// A Drizzle-like query: every builder method returns itself, and awaiting it gives `result`.
const query = (result: unknown) => {
  const q: Record<string, unknown> = {};
  for (const name of ["values", "returning", "set", "from", "where", "limit"]) q[name] = () => q;
  q.then = (resolve: (v: unknown) => void) => resolve(result);
  return q;
};
const inserted = vi.hoisted(() => [] as unknown[]);
const selects = vi.hoisted(() => [] as unknown[][]);

vi.mock("../src/db/index.js", () => {
  const db = {
    // The guest check finds a real account; the active Pro check finds none.
    select: () => query(selects.shift() ?? []),
    insert: () => ({
      values: (v: unknown) => {
        inserted.push(v);
        return query([{ id: "sub_row" }]);
      },
    }),
    transaction: async (run: (tx: unknown) => Promise<unknown>) => run(db),
  };
  return { db };
});
vi.mock("../src/lib/analytics.js", () => ({ track: vi.fn() }));
const razorpay = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/razorpay.js", () => ({ razorpay }));
vi.mock("../src/config/env.js", async (original) => ({
  env: {
    ...(await original<typeof import("../src/config/env.js")>()).env,
    RAZORPAY_KEY_ID: "rzp_test_x",
    RAZORPAY_PRO_PLAN_ID: "plan_inr",
    RAZORPAY_PRO_USD_PLAN_ID: "plan_usd",
  },
}));

import { createCheckout } from "../src/modules/billing/billing.service.js";

beforeEach(() => {
  inserted.length = 0;
  selects.splice(0, selects.length, [{ isAnonymous: false }], [{ isAnonymous: false }]);
  razorpay.mockReset();
  razorpay.mockResolvedValue({ id: "remote_1" });
});

describe("checkout pricing", () => {
  it("charges the Season Pass at ₹499, or ₹749 for the USD price", async () => {
    await expect(createCheckout("u", "season_pass")).resolves.toMatchObject({ amountPaise: 49_900 });
    await expect(createCheckout("u", "season_pass", "usd")).resolves.toMatchObject({ amountPaise: 74_900 });
    expect(razorpay.mock.calls.map(([, , body]) => (body as { amount: number }).amount)).toEqual([49_900, 74_900]);
  });

  it("subscribes Pro to the USD plan when the visitor chose USD", async () => {
    selects.splice(0, selects.length, [{ isAnonymous: false }], []);
    await expect(createCheckout("u", "pro", "usd")).resolves.toMatchObject({ amountPaise: 34_900 });
    expect(razorpay).toHaveBeenLastCalledWith(
      "POST",
      "/subscriptions",
      expect.objectContaining({ plan_id: "plan_usd" }),
    );
  });
});
