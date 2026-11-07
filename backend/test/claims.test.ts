import { describe, expect, it, vi } from "vitest";

const generateStructured = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/ai/generate.js", () => ({ generateStructured }));
vi.mock("../src/db/index.js", () => ({ db: {} }));

const { claimsByText, findUnsupportedClaims } = await import("../src/modules/suggestions/claims.js");

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

describe("findUnsupportedClaims", () => {
  it("drops a claim the model itself found the same evidence for", async () => {
    const claim = (quote: string, sameMeaning: boolean) => ({ index: 0, quote, closestEvidence: null, sameMeaning });
    generateStructured.mockResolvedValue({
      data: { unsupported: [claim("worked with designers", true), claim("led a team", false)] },
      runId: "run_1",
    });
    const found = await findUnsupportedClaims({ userId: null, sources: "s", texts: ["t"] });
    expect(found.map((c) => c.quote)).toEqual(["led a team"]);
    expect(generateStructured).toHaveBeenCalledWith(expect.objectContaining({ step: "verify", tier: "fast" }));
  });
});
