import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  plan: "free" as string,
  counts: [] as number[],
  downloaded: [] as string[],
  inserted: [] as Record<string, unknown>[],
  // Serialises transactions the way the advisory lock does in Postgres.
  queue: Promise.resolve() as Promise<unknown>,
  ownKey: false,
  currentVersionSeen: false,
}));

// Rows are told apart by the columns each query selects; the real SQL is covered by the migration and manual testing.
const select = vi.hoisted(() => (columns: Record<string, unknown> = {}) => {
  const keys = Object.keys(columns);
  const rows = () => {
    if (keys.includes("plan")) return [{ plan: state.plan }];
    if (keys.includes("resetAt")) return [{ resetAt: null }];
    if (keys.includes("versionId")) return state.currentVersionSeen ? [{ versionId: "seen" }] : [];
    return [{ value: state.counts.length ? state.counts.shift() : state.downloaded.length }];
  };
  const q: Record<string, unknown> = {};
  for (const name of ["from", "where", "limit"]) q[name] = () => q;
  q.then = (resolve: (v: unknown) => void) => resolve(rows());
  return q;
});

vi.mock("../src/db/index.js", () => {
  const tx = {
    select,
    execute: async () => undefined,
    insert: () => ({
      values: async (values: { versionId: string }) => {
        state.inserted.push(values);
        state.downloaded.push(values.versionId);
      },
    }),
  };
  return {
    db: {
      select,
      transaction: (run: (t: typeof tx) => Promise<unknown>) => {
        const next = state.queue.then(() => run(tx));
        state.queue = next.catch(() => undefined);
        return next;
      },
    },
  };
});
vi.mock("../src/modules/ai-keys/ai-keys.service.js", () => ({
  hasUserAiKey: vi.fn(async () => state.ownKey),
}));

import {
  assertAiQuota,
  assertResumeQuota,
  FREE_PDF_DOWNLOADS,
  planLimits,
  recordPdfDownload,
} from "../src/modules/usage/quotas.js";

beforeEach(() => {
  state.plan = "free";
  state.counts = [];
  state.downloaded = [];
  state.inserted = [];
  state.ownKey = false;
  state.currentVersionSeen = false;
});

describe("Free AI limits", () => {
  it("allows one tailor, one edit and one AI-written resume, for all time", async () => {
    for (const kind of ["tailor", "edit", "draft"] as const) {
      expect(planLimits.free[kind]).toBe(1);
      state.counts = [0];
      await expect(assertAiQuota("user_1", kind)).resolves.toBeUndefined();
      state.counts = [1];
      const refused = await assertAiQuota("user_1", kind).catch((error) => error);
      expect(refused).toMatchObject({ status: 402, code: "QUOTA_EXCEEDED" });
      // No reset date: a lifetime allowance doesn't come back next month.
      expect(refused.details.resetsAt).toBeUndefined();
    }
  });

  it("keeps compile fixes apart from the one edit, with a monthly cap", async () => {
    state.counts = [4];
    await expect(assertAiQuota("user_1", "fix")).resolves.toBeUndefined();
    state.counts = [5];
    const refused = await assertAiQuota("user_1", "fix").catch((error) => error);
    expect(refused.details.resetsAt).toBeInstanceOf(Date);
  });

  it("doesn't apply on the user's own AI key", async () => {
    state.ownKey = true;
    state.counts = [99];
    await expect(assertAiQuota("user_1", "tailor")).resolves.toBeUndefined();
  });

  it("gives paid plans monthly limits that reset", async () => {
    state.plan = "lifetime";
    state.counts = [59];
    await expect(assertAiQuota("user_1", "tailor")).resolves.toBeUndefined();
    state.counts = [60];
    const refused = await assertAiQuota("user_1", "tailor").catch((error) => error);
    expect(refused.details.resetsAt).toBeInstanceOf(Date);
  });
});

describe("resume cap", () => {
  it("lets Free create one resume and turns away a second", async () => {
    state.counts = [0];
    await expect(assertResumeQuota("user_1")).resolves.toBeUndefined();
    state.counts = [1];
    await expect(assertResumeQuota("user_1")).rejects.toMatchObject({ status: 402, code: "QUOTA_EXCEEDED" });
  });

  it("doesn't cap paid plans in practice", async () => {
    state.plan = "pro";
    state.counts = [50];
    await expect(assertResumeQuota("user_1")).resolves.toBeUndefined();
  });
});

describe("PDF downloads", () => {
  it("counts up to the limit, then refuses a new version", async () => {
    for (const version of ["v1", "v2", "v3"]) await recordPdfDownload("user_1", version);
    expect(state.inserted).toHaveLength(FREE_PDF_DOWNLOADS);
    await expect(recordPdfDownload("user_1", "v4")).rejects.toMatchObject({ status: 402, code: "QUOTA_EXCEEDED" });
    expect(state.inserted).toHaveLength(FREE_PDF_DOWNLOADS);
  });

  it("doesn't count the same version twice, even with none left", async () => {
    state.downloaded = ["v1", "v2", "v3"];
    state.currentVersionSeen = true;
    await expect(recordPdfDownload("user_1", "v1")).resolves.toBeUndefined();
    expect(state.inserted).toHaveLength(0);
  });

  it("lets only the allowed number through when requests run at once", async () => {
    const results = await Promise.allSettled(
      ["v1", "v2", "v3", "v4", "v5"].map((version) => recordPdfDownload("user_1", version)),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(FREE_PDF_DOWNLOADS);
    expect(state.inserted).toHaveLength(FREE_PDF_DOWNLOADS);
  });

  it("doesn't limit or record downloads on a paid plan", async () => {
    state.plan = "pro";
    state.downloaded = ["v1", "v2", "v3"];
    await expect(recordPdfDownload("user_1", "v4")).resolves.toBeUndefined();
    expect(state.inserted).toHaveLength(0);
  });
});
