import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

// A Drizzle-like query: every builder method returns itself, and awaiting it gives `result`.
const query = (result: unknown, onWhere?: (condition: SQL) => void) => {
  const q: Record<string, unknown> = {};
  for (const name of ["values", "returning", "set", "from", "leftJoin", "limit", "orderBy"]) q[name] = () => q;
  q.where = (condition: SQL) => {
    onWhere?.(condition);
    return q;
  };
  q.then = (resolve: (v: unknown) => void) => resolve(result);
  return q;
};

const state = vi.hoisted(() => ({
  claims: [] as unknown[][],
  claimConditions: [] as unknown[],
  updates: 0,
  subscription: null as Record<string, unknown> | null,
  earlierRefund: false,
  used: { tailor: 0, draft: 0 } as Record<string, number>,
}));

vi.mock("../src/db/index.js", () => {
  const db = {
    // The first update of a request is the claim; later ones release or finish it.
    update: () => {
      state.updates += 1;
      return query(state.claims.shift() ?? [], (c) => state.claimConditions.push(c));
    },
    // Payments are only read to look for an earlier refund; the other select is the subscription.
    select: () => {
      const q = query([]);
      q.from = (table: unknown) =>
        table === payments
          ? query(state.earlierRefund ? [{ id: "older" }] : [])
          : query(state.subscription ? [state.subscription] : []);
      return q;
    },
    transaction: async (run: (tx: unknown) => Promise<unknown>) => run(db),
  };
  return { db };
});
vi.mock("../src/modules/usage/quotas.js", async (original) => ({
  ...(await original<typeof import("../src/modules/usage/quotas.js")>()),
  runsSince: async (_userId: string, kind: string) => state.used[kind] ?? 0,
}));
vi.mock("../src/lib/analytics.js", () => ({ track: vi.fn() }));
const razorpay = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/razorpay.js", () => ({ razorpay }));

import { payments } from "../src/db/schema/index.js";
import { REFUND_WINDOW_MS, refundablePaise, requestRefund } from "../src/modules/billing/billing.service.js";

const paid = { amount: 49_900, status: "captured", fee: 1_178, tax: 180, amount_refunded: 0 };
const claimed = {
  id: "11111111-1111-4111-8111-111111111111",
  razorpayPaymentId: "pay_1",
  subscriptionId: null,
  capturedAt: new Date(),
};

beforeEach(() => {
  state.claims = [];
  state.claimConditions = [];
  state.updates = 0;
  state.subscription = null;
  state.earlierRefund = false;
  state.used = { tailor: 0, draft: 0 };
  razorpay.mockReset();
});

describe("refund amount", () => {
  it("is the amount paid minus Razorpay's fee, which already includes GST", () => {
    expect(refundablePaise(paid)).toBe(48_722);
  });

  it("refuses rather than guesses when Razorpay hasn't reported the fee", () => {
    expect(() => refundablePaise({ ...paid, fee: null })).toThrow(expect.objectContaining({ status: 503 }));
    expect(() => refundablePaise({ amount: 49_900, status: "captured" })).toThrow(
      expect.objectContaining({ code: "REFUND_FEE_UNAVAILABLE" }),
    );
  });

  it("refuses a payment already refunded in Razorpay", () => {
    expect(() => refundablePaise({ ...paid, amount_refunded: 100 })).toThrow(expect.objectContaining({ status: 409 }));
  });
});

describe("requesting a refund", () => {
  it("only claims a captured, unrefunded payment captured in the last 24 hours", async () => {
    const now = new Date("2026-10-21T12:00:00Z");
    await expect(requestRefund("user_1", claimed.id, now)).rejects.toMatchObject({ status: 409 });
    const { sql, params } = new PgDialect({ casing: "snake_case" }).sqlToQuery(state.claimConditions[0] as SQL);
    expect(sql).toContain('"payments"."refunded_at" is null');
    expect(sql).toContain('"payments"."captured_at" >');
    expect(params).toContainEqual(new Date(now.getTime() - REFUND_WINDOW_MS).toISOString());
    expect(params).toContain("captured");
    expect(razorpay).not.toHaveBeenCalled();
  });

  it("refunds once when two requests race for the same payment", async () => {
    state.claims = [[claimed], []];
    razorpay.mockImplementation(async (method: string, path: string) =>
      method === "GET" ? paid : path.endsWith("/refund") ? { id: "rfnd_1", amount: 48_722 } : {},
    );
    const results = await Promise.allSettled([
      requestRefund("user_1", claimed.id),
      requestRefund("user_1", claimed.id),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual(["fulfilled", "rejected"]);
    const refunds = razorpay.mock.calls.filter(([, path]) => String(path).endsWith("/refund"));
    expect(refunds).toEqual([["POST", "/payments/pay_1/refund", expect.objectContaining({ amount: 48_722 })]]);
  });

  it("releases the claim when Razorpay refuses, so the user can try again", async () => {
    state.claims = [[claimed]];
    razorpay.mockResolvedValueOnce({ ...paid, fee: undefined });
    await expect(requestRefund("user_1", claimed.id)).rejects.toMatchObject({ status: 503 });
    expect(state.updates).toBe(2);
  });

  it("finishes the refund when the call timed out but Razorpay refunded anyway", async () => {
    state.claims = [[claimed]];
    razorpay.mockImplementation(async (method: string, path: string) => {
      if (path.endsWith("/refund")) throw new Error("timeout");
      return path.endsWith("/refunds")
        ? {
            items: [
              { id: "rfnd_goodwill", amount: 5_000, notes: { reason: "Goodwill" } },
              { id: "rfnd_3", amount: 48_722, notes: { reason: `Self-serve refund ${claimed.id}` } },
            ],
          }
        : paid;
    });
    await expect(requestRefund("user_1", claimed.id)).resolves.toMatchObject({ razorpayRefundId: "rfnd_3" });
  });

  it("doesn't take an earlier goodwill refund for this one, and lets the user try again", async () => {
    state.claims = [[claimed]];
    razorpay.mockImplementation(async (method: string, path: string) => {
      if (path.endsWith("/refund")) throw new Error("timeout");
      return path.endsWith("/refunds")
        ? { items: [{ id: "rfnd_goodwill", amount: 5_000, notes: { reason: "Goodwill" } }] }
        : paid;
    });
    await expect(requestRefund("user_1", claimed.id)).rejects.toThrow("timeout");
    expect(state.updates).toBe(2);
  });

  it("refunds nothing when the Pro subscription can't be cancelled", async () => {
    state.claims = [[{ ...claimed, subscriptionId: "sub_row" }]];
    state.subscription = { id: "sub_row", plan: "pro", razorpaySubscriptionId: "sub_1", cancelledAt: null };
    razorpay.mockImplementation(async (method: string, path: string) => {
      if (path.endsWith("/cancel")) throw new Error("Razorpay down");
      return method === "GET" ? { ...paid, amount: 12_900, fee: 305 } : { id: "rfnd_x", amount: 12_595 };
    });
    await expect(requestRefund("user_1", claimed.id)).rejects.toThrow("Razorpay down");
    expect(razorpay.mock.calls.some(([, path]) => String(path).endsWith("/refund"))).toBe(false);
  });

  it("refuses once more than 3 tailored or AI-written resumes were made since paying, and frees the claim", async () => {
    state.claims = [[{ ...claimed, capturedAt: new Date() }]];
    state.used = { tailor: 4, draft: 0 };
    await expect(requestRefund("user_1", claimed.id)).rejects.toMatchObject({ status: 409 });
    expect(state.updates).toBe(2);
    expect(razorpay).not.toHaveBeenCalled();
  });

  it("gives each account one refund", async () => {
    state.claims = [[{ ...claimed, capturedAt: new Date() }]];
    state.earlierRefund = true;
    await expect(requestRefund("user_1", claimed.id)).rejects.toThrow("one refund");
    expect(razorpay).not.toHaveBeenCalled();
  });

  it("cancels a refunded Pro subscription in Razorpay straight away", async () => {
    state.claims = [[{ ...claimed, subscriptionId: "sub_row" }]];
    state.subscription = { id: "sub_row", plan: "pro", razorpaySubscriptionId: "sub_1", cancelledAt: null };
    razorpay.mockImplementation(async (method: string, path: string) =>
      method === "GET"
        ? { ...paid, amount: 12_900, fee: 305 }
        : path.endsWith("/refund")
          ? { id: "rfnd_2", amount: 12_595 }
          : {},
    );
    await expect(requestRefund("user_1", claimed.id)).resolves.toMatchObject({ refundPaise: 12_595 });
    expect(razorpay).toHaveBeenCalledWith("POST", "/subscriptions/sub_1/cancel", { cancel_at_cycle_end: 0 });
  });
});
