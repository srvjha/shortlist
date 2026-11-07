import { describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/ai/generate.js", () => ({ generateStructured: vi.fn() }));
vi.mock("../src/db/index.js", () => ({ db: {} }));

const { claimsByText } = await import("../src/modules/suggestions/claims.js");

describe("claimsByText", () => {
  it("keeps each quote with its own text, ignoring case and repeats", () => {
    const found = [
      { index: 1, quote: "Managed Paid Social" },
      { index: 1, quote: "Managed Paid Social" },
      { index: 0, quote: "led a team" },
    ];
    expect(claimsByText(found, ["I led a team", "I managed paid social spend"])).toEqual([
      ["led a team"],
      ["Managed Paid Social"],
    ]);
  });

  it("drops quotes that aren't in that text and indexes that don't exist", () => {
    const found = [
      { index: 0, quote: "never written" },
      { index: 5, quote: "led a team" },
      { index: 0, quote: "  " },
    ];
    expect(claimsByText(found, ["I led a team"])).toEqual([[]]);
  });
});
