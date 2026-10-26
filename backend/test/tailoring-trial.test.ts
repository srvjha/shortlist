import { describe, expect, it, vi } from "vitest";

vi.mock("../src/db/index.js", () => ({ db: {} }));
vi.mock("../src/modules/ai-keys/ai-keys.service.js", () => ({ hasUserAiKey: vi.fn() }));

import { trialEndsAt } from "../src/modules/usage/quotas.js";

const day = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-28T12:00:00Z");

describe("tailoring trial", () => {
  it("runs for the first 7 days of a Free account", () => {
    const createdAt = new Date(now.getTime() - 2 * day);
    expect(trialEndsAt({ plan: "free", createdAt }, now)).toEqual(new Date(createdAt.getTime() + 7 * day));
  });

  it("ends after 7 days", () => {
    expect(trialEndsAt({ plan: "free", createdAt: new Date(now.getTime() - 7 * day) }, now)).toBeNull();
  });

  it("doesn't apply to paid plans", () => {
    expect(trialEndsAt({ plan: "season_pass", createdAt: now }, now)).toBeNull();
  });
});
