import { Webhook } from "standardwebhooks";
import { beforeEach, describe, expect, it, vi } from "vitest";

const secret = "whsec_dGVzdC1zZWNyZXQ=";
vi.mock("../src/config/env.js", async (original) => ({
  env: {
    ...(await original<typeof import("../src/config/env.js")>()).env,
    DODO_PAYMENTS_API_KEY: "test_key",
    DODO_PAYMENTS_WEBHOOK_KEY: "whsec_dGVzdC1zZWNyZXQ=",
    DODO_PRODUCT_PRO: "pdt_pro",
    DODO_PRODUCT_LIFETIME: "pdt_lifetime",
    FRONTEND_URL: "https://shortlist.test",
  },
}));

// A Drizzle-like query: every builder method returns itself, and awaiting it gives `result`.
const query = (result: unknown, fail?: Error) => {
  const q: Record<string, unknown> = {};
  for (const name of [
    "values",
    "onConflictDoNothing",
    "returning",
    "set",
    "where",
    "from",
    "innerJoin",
    "limit",
    "orderBy",
  ])
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
  inserted: [] as Record<string, unknown>[],
  insertResults: [] as unknown[][],
}));

vi.mock("../src/db/index.js", () => {
  const tx = {
    insert: () => {
      state.calls.push("insert");
      const q = query(state.insertResults.shift() ?? [{ id: "new" }]);
      q.values = (values: Record<string, unknown>) => {
        state.inserted.push(values);
        return q;
      };
      return q;
    },
    update: () => {
      state.calls.push("update");
      const q = query(undefined, state.updateFails ? new Error("database down") : undefined);
      q.set = (values: Record<string, unknown>) => {
        state.sets.push(values);
        return q;
      };
      return q;
    },
    select: () => query(state.selects.shift() ?? []),
  };
  const db = {
    ...tx,
    // A real transaction rolls back on throw; here a failure simply never commits.
    transaction: async (run: (t: typeof tx) => Promise<unknown>) => {
      const result = await run(tx);
      state.committed = true;
      return result;
    },
  };
  return { db };
});
vi.mock("../src/lib/analytics.js", () => ({ track: vi.fn() }));

const remote = vi.hoisted(() => ({
  sessionCreate: vi.fn(),
  sessionRetrieve: vi.fn(),
  paymentRetrieve: vi.fn(),
  subscriptionRetrieve: vi.fn(),
  subscriptionUpdate: vi.fn(),
}));
vi.mock("dodopayments", () => ({
  default: class {
    checkoutSessions = { create: remote.sessionCreate, retrieve: remote.sessionRetrieve };
    payments = { retrieve: remote.paymentRetrieve };
    subscriptions = { retrieve: remote.subscriptionRetrieve, update: remote.subscriptionUpdate };
  },
}));

import { createCheckout, recomputePlan } from "../src/modules/billing/billing.service.js";
import { type BillingEvent, dodoEvents, readDodoWebhook } from "../src/modules/billing/dodo.js";
import { confirmCheckout, handleEvents } from "../src/modules/billing/webhooks.js";

const CHECKOUT = "11111111-1111-4111-8111-111111111111";
const tagged = { app: "shortlist", checkout: CHECKOUT };
const paid: BillingEvent = {
  type: "paid",
  checkoutSessionId: "cks_1",
  checkout: CHECKOUT,
  subscriptionId: null,
  paymentId: "pay_1",
  method: "card",
};
const firstPayment = { id: "pay_row", amount: 9_000, status: "created", createdAt: new Date() };
const row = (plan: string, status = "created") => ({ id: CHECKOUT, userId: "user_1", plan, status });

beforeEach(() => {
  state.committed = false;
  state.updateFails = false;
  state.calls = [];
  state.selects = [];
  state.sets = [];
  state.inserted = [];
  state.insertResults = [];
  for (const mock of Object.values(remote)) mock.mockReset();
});

describe("webhook signature", () => {
  const headersFor = (body: string, key = secret) => {
    const id = "msg_1";
    const at = new Date();
    return {
      "webhook-id": id,
      "webhook-timestamp": String(Math.floor(at.getTime() / 1000)),
      "webhook-signature": new Webhook(key).sign(id, at, body),
    };
  };

  it("accepts a delivery signed with our key", () => {
    const body = JSON.stringify({ type: "payment.succeeded", data: { payment_id: "pay_1" } });
    expect(readDodoWebhook(Buffer.from(body), headersFor(body))).toMatchObject({ type: "payment.succeeded" });
  });

  it("refuses a changed body or another key", () => {
    const body = JSON.stringify({ type: "payment.succeeded" });
    expect(readDodoWebhook(Buffer.from(`${body} `), headersFor(body))).toBeNull();
    expect(readDodoWebhook(Buffer.from(body), headersFor(body, "whsec_b3RoZXItc2VjcmV0"))).toBeNull();
  });
});

describe("events from other products on the same Dodo business", () => {
  const data = { payment_id: "pay_x", subscription_id: "sub_x", subscription: "sub_x", refund_id: "r" };

  it("ignores anything tagged for another app", () => {
    for (const type of ["payment.succeeded", "subscription.active", "refund.succeeded"]) {
      expect(dodoEvents({ type, data: { ...data, metadata: { app: "thumbai" } } })).toEqual([]);
    }
  });

  it("ignores an untagged one-time payment", () => {
    expect(dodoEvents({ type: "payment.succeeded", data: { payment_id: "pay_x", metadata: {} } })).toEqual([]);
  });

  it("does nothing for a subscription or payment that matches no row of ours", async () => {
    state.selects = [[], []];
    await handleEvents(
      "evt_1",
      dodoEvents({ type: "payment.succeeded", data: { payment_id: "pay_x", subscription_id: "sub_x", metadata: {} } }),
      {},
    );
    expect(state.calls).toEqual(["insert"]);
  });

  it("ignores events it has no use for", () => {
    expect(dodoEvents({ type: "dispute.opened", data: {} })).toEqual([]);
    expect(dodoEvents({ type: "subscription.updated", data: { metadata: tagged } })).toEqual([]);
  });
});

describe("translating Dodo events", () => {
  const subscription = {
    subscription_id: "sub_1",
    metadata: tagged,
    previous_billing_date: "2026-11-01T00:00:00Z",
    next_billing_date: "2026-12-01T00:00:00Z",
  };

  it.each([
    ["active", "active"],
    ["renewed", "active"],
    ["on_hold", "past_due"],
    ["past_due", "past_due"],
    ["cancelled", "cancelled"],
    ["failed", "expired"],
    ["expired", "expired"],
  ])("subscription.%s means %s", (state_, status) => {
    expect(dodoEvents({ type: `subscription.${state_}`, data: subscription })).toEqual([
      {
        type: "subscription",
        subscriptionId: "sub_1",
        checkout: CHECKOUT,
        status,
        periodStart: new Date("2026-11-01T00:00:00Z"),
        periodEnd: new Date("2026-12-01T00:00:00Z"),
      },
    ]);
  });

  it("keeps a renewal payment that lost the checkout's metadata, by its subscription", () => {
    expect(
      dodoEvents({ type: "payment.succeeded", data: { payment_id: "pay_2", subscription_id: "sub_1", metadata: {} } }),
    ).toMatchObject([{ type: "paid", paymentId: "pay_2", subscriptionId: "sub_1", checkout: null }]);
  });

  it("treats only a partial refund as partial", () => {
    expect(
      dodoEvents({ type: "refund.succeeded", data: { payment_id: "pay_1", is_partial: true, metadata: {} } }),
    ).toEqual([{ type: "refunded", paymentId: "pay_1", full: false }]);
  });
});

describe("handling a delivery", () => {
  it("records the event id inside the same transaction as its effects", async () => {
    await handleEvents("evt_1", [{ type: "failed", checkoutSessionId: "cks_1" }], {});
    expect(state.calls).toEqual(["insert", "update"]);
    expect(state.committed).toBe(true);
  });

  it("fails the whole delivery when processing fails, so Dodo retries it", async () => {
    state.updateFails = true;
    await expect(handleEvents("evt_2", [{ type: "failed", checkoutSessionId: "cks_1" }], {})).rejects.toThrow(
      "database down",
    );
    expect(state.committed).toBe(false);
  });

  it("applies a delivery once", async () => {
    state.insertResults = [[]];
    await handleEvents("evt_3", [paid], {});
    expect(state.calls).toEqual(["insert"]);
  });
});

describe("Lifetime", () => {
  it("gives a far-future end date on payment", async () => {
    state.selects = [[row("lifetime")], [firstPayment], [{ plan: "lifetime" }]];
    await handleEvents("evt_1", [paid], {});
    const period = state.sets.find((set) => set.currentPeriodEnd)!;
    expect(period.status).toBe("active");
    expect((period.currentPeriodEnd as Date).getFullYear()).toBe(
      (period.currentPeriodStart as Date).getFullYear() + 100,
    );
    expect(state.sets).toContainEqual({ plan: "lifetime" });
  });

  it("stops a running Pro after the payment commits, so it doesn't keep charging", async () => {
    remote.subscriptionUpdate.mockResolvedValue({});
    state.selects = [
      [row("lifetime")],
      [firstPayment],
      [{ plan: "lifetime" }, { plan: "pro" }],
      [{ id: "pro_row", providerSubscriptionId: "sub_pro" }],
      [{ plan: "lifetime" }],
      [],
    ];
    await handleEvents("evt_1", [paid], {});
    await vi.waitFor(() =>
      expect(remote.subscriptionUpdate).toHaveBeenCalledWith("sub_pro", { cancel_at_next_billing_date: true }),
    );
  });

  it("outranks every other plan", async () => {
    state.selects = [[{ plan: "season_pass" }, { plan: "pro" }, { plan: "lifetime" }]];
    await expect(recomputePlan("user_1")).resolves.toBe("lifetime");
    state.selects = [[{ plan: "season_pass" }, { plan: "pro" }]];
    await expect(recomputePlan("user_1")).resolves.toBe("pro");
  });
});

describe("Pro", () => {
  const event: BillingEvent = {
    type: "subscription",
    subscriptionId: "sub_1",
    checkout: CHECKOUT,
    status: "active",
    periodStart: new Date("2026-11-01T00:00:00Z"),
    periodEnd: new Date("2026-12-01T00:00:00Z"),
  };

  it("links the Dodo subscription to the checkout's row and takes its dates", async () => {
    state.selects = [[], [row("pro")], [{ plan: "pro" }]];
    await handleEvents("evt_1", [event], {});
    expect(state.sets[0]).toMatchObject({
      providerSubscriptionId: "sub_1",
      status: "active",
      currentPeriodEnd: event.periodEnd,
    });
  });

  it("doesn't add a month when the first payment arrives after the subscription event", async () => {
    state.selects = [[row("pro", "active")], [{ ...firstPayment, amount: 1_200 }], [{ plan: "pro" }]];
    await handleEvents("evt_2", [{ ...paid, subscriptionId: "sub_1" }], {});
    expect(state.sets.some((set) => set.currentPeriodEnd)).toBe(false);
  });

  it("records a renewal as a new payment at the Pro price", async () => {
    state.selects = [[row("pro", "active")], [], [{ plan: "pro" }]];
    await handleEvents(
      "evt_3",
      [{ ...paid, checkout: null, checkoutSessionId: null, subscriptionId: "sub_1", paymentId: "pay_2" }],
      {},
    );
    expect(state.inserted.at(-1)).toMatchObject({
      providerPaymentId: "pay_2",
      amount: 1_200,
      currency: "USD",
      status: "captured",
    });
  });

  it("doesn't revive a plan already ended here", async () => {
    state.selects = [[row("pro", "expired")]];
    await handleEvents("evt_4", [event], {});
    expect(state.sets).toEqual([]);
  });

  it("keeps a plan cancelled here cancelled when an active event arrives late", async () => {
    state.selects = [[{ ...row("pro", "cancelled"), cancelledAt: new Date() }], [{ plan: "pro" }]];
    await handleEvents("evt_5", [event], {});
    expect(state.sets[0]).toMatchObject({ status: "cancelled" });
  });
});

describe("the buyer's return from checkout", () => {
  it("reads the payment from Dodo and activates the plan", async () => {
    remote.sessionRetrieve.mockResolvedValue({ id: "cks_1", payment_id: "pay_1" });
    remote.paymentRetrieve.mockResolvedValue({
      payment_id: "pay_1",
      status: "succeeded",
      metadata: tagged,
      checkout_session_id: "cks_1",
    });
    state.selects = [
      [{ sessionId: "cks_1" }],
      [row("lifetime")],
      [firstPayment],
      [{ plan: "lifetime" }],
      [],
      [{ plan: "lifetime" }],
      [],
    ];
    await expect(confirmCheckout("user_1", CHECKOUT)).resolves.toMatchObject({ plan: "lifetime" });
    expect(state.sets.find((set) => set.status === "active")).toBeTruthy();
    expect(remote.sessionRetrieve).toHaveBeenCalledWith("cks_1");
  });

  it("does nothing while nothing is paid", async () => {
    remote.sessionRetrieve.mockResolvedValue({ id: "cks_1" });
    state.selects = [[{ sessionId: "cks_1" }], [{ plan: "free" }], []];
    await expect(confirmCheckout("user_1", CHECKOUT)).resolves.toMatchObject({ plan: "free" });
    expect(remote.paymentRetrieve).not.toHaveBeenCalled();
  });

  it("finds nothing for someone else's checkout", async () => {
    state.selects = [[]];
    await expect(confirmCheckout("user_2", CHECKOUT)).rejects.toMatchObject({ status: 404 });
  });
});

describe("starting a checkout", () => {
  const notGuest = [{ isAnonymous: false }];
  const buyer = [{ email: "a@example.com", name: "A" }];

  beforeEach(() => {
    remote.sessionCreate.mockResolvedValue({ session_id: "cks_1", checkout_url: "https://checkout.test/cks_1" });
  });

  it("charges the server's price and tags the session for this app", async () => {
    state.selects = [notGuest, [], buyer];
    await expect(createCheckout("user_1", "lifetime")).resolves.toMatchObject({
      url: "https://checkout.test/cks_1",
      amount: 9_000,
      currency: "USD",
    });
    const session = remote.sessionCreate.mock.calls[0]![0];
    expect(session.product_cart).toEqual([{ product_id: "pdt_lifetime", quantity: 1 }]);
    expect(session.metadata).toMatchObject({ app: "shortlist", plan: "lifetime" });
    expect(state.inserted.at(-1)).toMatchObject({ providerCheckoutId: "cks_1", amount: 9_000, provider: "dodo" });
  });

  it("refuses Pro to someone with Pro or Lifetime, and Lifetime to someone with Lifetime", async () => {
    for (const [held, buying] of [
      ["pro", "pro"],
      ["lifetime", "pro"],
      ["lifetime", "lifetime"],
    ] as const) {
      state.selects = [notGuest, [{ plan: held }]];
      await expect(createCheckout("user_1", buying)).rejects.toMatchObject({ status: 409 });
    }
    expect(remote.sessionCreate).not.toHaveBeenCalled();
  });

  it("lets someone on Pro move to Lifetime", async () => {
    state.selects = [notGuest, [{ plan: "pro" }], buyer];
    await expect(createCheckout("user_1", "lifetime")).resolves.toMatchObject({ plan: "lifetime" });
  });
});
