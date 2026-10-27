import { beforeEach, describe, expect, it, vi } from "vitest";

// A Drizzle-like query: every builder method returns itself, and awaiting it gives `result`.
const query = (result: unknown, fail?: Error) => {
  const q: Record<string, unknown> = {};
  for (const name of ["values", "onConflictDoNothing", "returning", "set", "where", "from", "limit", "orderBy"])
    q[name] = () => q;
  q.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) => (fail ? reject(fail) : resolve(result));
  return q;
};

const state = vi.hoisted(() => ({
  committed: false,
  updateFails: false,
  calls: [] as string[],
  selects: [] as unknown[][],
  sets: [] as Record<string, unknown>[],
}));

vi.mock("../src/db/index.js", () => {
  const tx = {
    insert: () => {
      state.calls.push("tx.insert");
      return query([{ id: "evt" }]);
    },
    update: () => {
      state.calls.push("tx.update");
      const q = query(undefined, state.updateFails ? new Error("database down") : undefined);
      const where = q.where;
      q.set = (values: Record<string, unknown>) => {
        state.sets.push(values);
        return { where };
      };
      return q;
    },
    select: () => query(state.selects.shift() ?? []),
  };
  const db = {
    // A real transaction rolls back on throw; here a failure simply never commits.
    transaction: async (run: (t: typeof tx) => Promise<unknown>) => {
      const result = await run(tx);
      state.committed = true;
      return result;
    },
    insert: () => {
      state.calls.push("db.insert");
      return query([]);
    },
  };
  return { db };
});
vi.mock("../src/lib/analytics.js", () => ({ track: vi.fn() }));

import { razorpayEvents } from "../src/modules/billing/providers/razorpay.js";
import { handleEvents } from "../src/modules/billing/webhooks.js";

const handleRazorpayEvent = (event: typeof failed, eventId: string) =>
  handleEvents("razorpay", eventId, razorpayEvents(event), event);

const failed = {
  event: "payment.failed",
  payload: { payment: { entity: { id: "pay_1", order_id: "order_1" } } },
};

beforeEach(() => {
  state.committed = false;
  state.updateFails = false;
  state.calls = [];
  state.selects = [];
  state.sets = [];
});

describe("Razorpay webhooks", () => {
  it("records the event id inside the same transaction as its effects", async () => {
    await handleRazorpayEvent(failed, "evt_1");
    expect(state.calls).toEqual(["tx.insert", "tx.update"]);
    expect(state.committed).toBe(true);
  });

  it("fails the whole delivery when processing fails, so Razorpay retries it", async () => {
    state.updateFails = true;
    await expect(handleRazorpayEvent(failed, "evt_2")).rejects.toThrow("database down");
    expect(state.calls).toEqual(["tx.insert", "tx.update"]);
    expect(state.committed).toBe(false);
  });
});

describe("Razorpay events", () => {
  it("translates a monthly charge into a subscription update with its payment", () => {
    const [event] = razorpayEvents({
      event: "subscription.charged",
      payload: {
        subscription: { entity: { id: "sub_1", current_start: 1_800_000_000, current_end: 1_802_592_000 } },
        payment: { entity: { id: "pay_2", order_id: "order_2", amount: 12_900, method: "upi" } },
      },
    });
    expect(event).toEqual({
      type: "subscription",
      subscriptionId: "sub_1",
      status: "active",
      periodStart: new Date(1_800_000_000_000),
      periodEnd: new Date(1_802_592_000_000),
      charge: { paymentId: "pay_2", checkoutId: "order_2", amount: 12_900, method: "upi" },
    });
  });

  it("uses the payment's running refund total, so partial refunds add up", () => {
    expect(
      razorpayEvents({
        event: "refund.processed",
        payload: {
          refund: { entity: { id: "rfnd_2", payment_id: "pay_1", amount: 100 } },
          payment: { entity: { id: "pay_1", amount_refunded: 49_900 } },
        },
      }),
    ).toEqual([{ type: "refunded", paymentId: "pay_1", refunded: 49_900 }]);
  });
});

describe("one-time payments", () => {
  it("gives a Pro month bought on Polar one month, starting now", async () => {
    state.selects = [
      [{ id: "pay_row", userId: "user_1", subscriptionId: "sub_row", status: "created", amount: 400, currency: "USD" }],
      [{ plan: "pro" }],
    ];
    const before = new Date();
    await handleEvents(
      "polar",
      "msg_1",
      [{ type: "paid", checkoutId: "co_1", paymentId: "order_1", method: null, amount: 400 }],
      {},
    );
    const period = state.sets.find((set) => set.currentPeriodEnd)!;
    const expected = new Date(period.currentPeriodStart as Date);
    expected.setMonth(expected.getMonth() + 1);
    expect(period).toMatchObject({ status: "active", currentPeriodEnd: expected });
    expect((period.currentPeriodStart as Date) >= before).toBe(true);
  });
});
