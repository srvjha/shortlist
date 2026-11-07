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
vi.mock("../src/lib/analytics.js", () => ({ track: vi.fn(), captureError: vi.fn() }));
const sendEmail = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/email.js", () => ({ sendEmail }));
const remote = vi.hoisted(() => ({ payment: vi.fn(), update: vi.fn(), refund: vi.fn() }));
vi.mock("../src/modules/billing/dodo.js", async (original) => ({
  ...(await original<typeof import("../src/modules/billing/dodo.js")>()),
  dodo: () => ({
    payments: { retrieve: remote.payment },
    subscriptions: { update: remote.update },
    refunds: { create: remote.refund },
  }),
}));

import { payments } from "../src/db/schema/index.js";
import { getRefundQuote, REFUND_WINDOW_MS, requestRefund } from "../src/modules/billing/billing.service.js";

const paid = { status: "succeeded", refunds: [] };
const claimed = {
  id: "11111111-1111-4111-8111-111111111111",
  provider: "dodo",
  currency: "USD",
  amount: 9_000,
  providerPaymentId: "pay_1",
  subscriptionId: null,
  capturedAt: new Date(),
};
const proRow = { id: "sub_row", plan: "pro", provider: "dodo", providerSubscriptionId: "sub_1", cancelledAt: null };

beforeEach(() => {
  state.claims = [];
  state.claimConditions = [];
  state.updates = 0;
  state.subscription = null;
  state.earlierRefund = false;
  state.used = { tailor: 0, draft: 0 };
  remote.payment.mockReset().mockResolvedValue(paid);
  remote.update.mockReset().mockResolvedValue({});
  remote.refund.mockReset().mockResolvedValue({ refund_id: "rfnd_1" });
  sendEmail.mockReset().mockResolvedValue(true);
});

describe("the refund window", () => {
  it("is 7 days", () => {
    expect(REFUND_WINDOW_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe("requesting a refund", () => {
  it("only claims a captured, unrefunded Dodo payment captured in the last 7 days", async () => {
    const now = new Date("2026-10-21T12:00:00Z");
    await expect(requestRefund("user_1", claimed.id, now)).rejects.toMatchObject({ status: 409 });
    const { sql, params } = new PgDialect({ casing: "snake_case" }).sqlToQuery(state.claimConditions[0] as SQL);
    expect(sql).toContain('"payments"."refunded_at" is null');
    expect(sql).toContain('"payments"."captured_at" >');
    expect(params).toContainEqual(new Date(now.getTime() - REFUND_WINDOW_MS).toISOString());
    expect(params).toContain("captured");
    expect(params).toContain("dodo");
    expect(remote.refund).not.toHaveBeenCalled();
  });

  it("refunds the full amount, without naming items, so Dodo returns everything charged", async () => {
    state.claims = [[claimed]];
    await expect(requestRefund("user_1", claimed.id)).resolves.toMatchObject({
      refund: 9_000,
      currency: "USD",
      providerRefundId: "rfnd_1",
    });
    const sent = remote.refund.mock.calls[0]![0];
    expect(sent).toMatchObject({ payment_id: "pay_1", metadata: { app: "shortlist" } });
    expect(sent.items).toBeUndefined();
  });

  it("refunds once when two requests race for the same payment", async () => {
    state.claims = [[claimed], []];
    const results = await Promise.allSettled([
      requestRefund("user_1", claimed.id),
      requestRefund("user_1", claimed.id),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual(["fulfilled", "rejected"]);
    expect(remote.refund).toHaveBeenCalledTimes(1);
  });

  it("releases the claim when Dodo refuses, so the user can try again", async () => {
    state.claims = [[claimed]];
    remote.refund.mockRejectedValue(new Error("refused"));
    await expect(requestRefund("user_1", claimed.id)).rejects.toThrow("refused");
    expect(state.updates).toBe(2);
  });

  it("keeps the request and tells an admin when the Dodo balance is too low to pay it", async () => {
    state.claims = [[claimed]];
    remote.refund.mockRejectedValue(Object.assign(new Error("409 Insufficient funds in wallet"), { status: 409 }));
    await expect(requestRefund("user_1", claimed.id)).rejects.toMatchObject({ status: 503, code: "REFUND_DELAYED" });
    expect(state.updates).toBe(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining("pay_1") as unknown }),
    );
  });

  it("refuses a payment already refunded at Dodo, and frees the claim", async () => {
    state.claims = [[claimed]];
    remote.payment.mockResolvedValue({ ...paid, refunds: [{ refund_id: "r", status: "succeeded" }] });
    await expect(requestRefund("user_1", claimed.id)).rejects.toMatchObject({ status: 409 });
    expect(remote.refund).not.toHaveBeenCalled();
    expect(state.updates).toBe(2);
  });

  it("finishes the refund when the call timed out but Dodo refunded anyway", async () => {
    state.claims = [[claimed]];
    remote.refund.mockRejectedValue(new Error("timeout"));
    remote.payment.mockResolvedValueOnce(paid).mockResolvedValueOnce({
      ...paid,
      refunds: [
        { refund_id: "rfnd_goodwill", reason: "Goodwill", status: "succeeded" },
        { refund_id: "rfnd_3", reason: `Self-serve refund ${claimed.id}`, status: "succeeded" },
      ],
    });
    await expect(requestRefund("user_1", claimed.id)).resolves.toMatchObject({ providerRefundId: "rfnd_3" });
  });

  it("doesn't take an earlier goodwill refund for this one, and lets the user try again", async () => {
    state.claims = [[claimed]];
    remote.refund.mockRejectedValue(new Error("timeout"));
    remote.payment
      .mockResolvedValueOnce(paid)
      .mockResolvedValueOnce({ ...paid, refunds: [{ refund_id: "r", reason: "Goodwill", status: "succeeded" }] });
    await expect(requestRefund("user_1", claimed.id)).rejects.toThrow("timeout");
    expect(state.updates).toBe(2);
  });

  it("refunds nothing when the Pro subscription can't be cancelled", async () => {
    state.claims = [[{ ...claimed, subscriptionId: "sub_row" }]];
    state.subscription = proRow;
    remote.update.mockRejectedValue(new Error("Dodo down"));
    await expect(requestRefund("user_1", claimed.id)).rejects.toThrow("Dodo down");
    expect(remote.refund).not.toHaveBeenCalled();
  });

  it("refuses once more than 3 tailored or AI-written resumes were made since paying, and frees the claim", async () => {
    state.claims = [[{ ...claimed, capturedAt: new Date() }]];
    state.used = { tailor: 4, draft: 0 };
    await expect(requestRefund("user_1", claimed.id)).rejects.toMatchObject({ status: 409 });
    expect(state.updates).toBe(2);
    expect(remote.refund).not.toHaveBeenCalled();

    state.claims = [[{ ...claimed, capturedAt: new Date() }]];
    state.used = { tailor: 0, draft: 4 };
    await expect(requestRefund("user_1", claimed.id)).rejects.toMatchObject({ status: 409 });
  });

  it("allows exactly 3 of each", async () => {
    state.claims = [[claimed]];
    state.used = { tailor: 3, draft: 3 };
    await expect(requestRefund("user_1", claimed.id)).resolves.toMatchObject({ refund: 9_000 });
  });

  it("gives each account one refund", async () => {
    state.claims = [[{ ...claimed, capturedAt: new Date() }]];
    state.earlierRefund = true;
    await expect(requestRefund("user_1", claimed.id)).rejects.toThrow("one refund");
    expect(remote.refund).not.toHaveBeenCalled();
  });

  it("cancels a refunded Pro subscription at Dodo straight away, before refunding", async () => {
    state.claims = [[{ ...claimed, amount: 1_200, subscriptionId: "sub_row" }]];
    state.subscription = proRow;
    await expect(requestRefund("user_1", claimed.id)).resolves.toMatchObject({ refund: 1_200 });
    expect(remote.update).toHaveBeenCalledWith("sub_1", { status: "cancelled" });
    expect(remote.update.mock.invocationCallOrder[0]!).toBeLessThan(remote.refund.mock.invocationCallOrder[0]!);
  });

  it("doesn't cancel again a Pro already cancelled for the period's end", async () => {
    state.claims = [[{ ...claimed, amount: 1_200, subscriptionId: "sub_row" }]];
    state.subscription = { ...proRow, cancelledAt: new Date() };
    await requestRefund("user_1", claimed.id);
    expect(remote.update).not.toHaveBeenCalled();
    expect(remote.refund).toHaveBeenCalledOnce();
  });
});

describe("the refund quote", () => {
  it("says nothing when no payment is in the window", async () => {
    await expect(getRefundQuote("user_1")).resolves.toEqual({ quote: null, reason: null, status: null });
  });
});
