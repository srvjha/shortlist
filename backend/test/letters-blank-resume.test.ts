import { describe, expect, it, vi } from "vitest";

vi.mock("../src/db/index.js", () => ({ db: {} }));

const { hasResumeFacts } = await import("../src/modules/letters/letters.service.js");
const basics = { name: "Neha", links: [] };

describe("hasResumeFacts", () => {
  it("is false for a blank resume, including sections with nothing in them", () => {
    expect(hasResumeFacts({ basics, sections: [] }, "")).toBe(false);
    const empty = { id: "s", title: "Experience", hidden: false, type: "experience" as const, entries: [] };
    expect(hasResumeFacts({ basics, sections: [empty] }, "")).toBe(false);
    expect(hasResumeFacts(null, "   ")).toBe(false);
  });

  it("is true once a section has content, or a code resume has text", () => {
    const summary = { id: "s", title: "Summary", hidden: false, type: "summary" as const, text: "Marketer" };
    expect(hasResumeFacts({ basics, sections: [summary] }, "")).toBe(true);
    expect(hasResumeFacts(null, "Marketer")).toBe(true);
  });
});
