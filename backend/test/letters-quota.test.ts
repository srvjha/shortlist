import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ results: [] as unknown[][], ownKey: false }));

vi.mock("../src/db/index.js", () => {
  const query = () => {
    const q: Record<string, unknown> = {};
    for (const name of ["from", "where", "limit"]) q[name] = () => q;
    q.then = (resolve: (v: unknown) => void) => resolve(state.results.shift());
    return q;
  };
  return { db: { select: query } };
});
vi.mock("../src/modules/ai-keys/ai-keys.service.js", () => ({ hasUserAiKey: async () => state.ownKey }));

import { assertAiQuota } from "../src/modules/usage/quotas.js";

const used = (plan: string, value: number) => {
  state.results = [[{ plan, createdAt: new Date() }], [{ resetAt: null }], [{ value }]];
};

describe("AI cover letter quota", () => {
  beforeEach(() => {
    state.ownKey = false;
  });

  it.each(["free", "pro"])("allows the 30th letter of the month on %s", async (plan) => {
    used(plan, 29);
    await expect(assertAiQuota("user_1", "letter")).resolves.toBeUndefined();
  });

  it.each(["free", "pro"])("stops at 30 on %s, with the same message", async (plan) => {
    used(plan, 30);
    await expect(assertAiQuota("user_1", "letter")).rejects.toMatchObject({
      status: 402,
      code: "QUOTA_EXCEEDED",
      message: "You've used all 30 AI cover letters for this month",
    });
  });

  it("isn't limited on the user's own key", async () => {
    state.ownKey = true;
    state.results = [];
    await expect(assertAiQuota("user_1", "letter")).resolves.toBeUndefined();
  });
});
