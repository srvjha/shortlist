import { describe, expect, it } from "vitest";
import { isAdmin } from "../src/middleware/require-admin.js";

describe("isAdmin", () => {
  it("matches listed emails case-insensitively", () => {
    expect(isAdmin({ email: "admin@example.com", emailVerified: true })).toBe(true);
    expect(isAdmin({ email: "SECOND@example.com", emailVerified: true })).toBe(true);
  });

  it("never trusts an unverified email", () => {
    expect(isAdmin({ email: "admin@example.com", emailVerified: false })).toBe(false);
  });

  it("rejects everyone else", () => {
    expect(isAdmin({ email: "someone@example.com", emailVerified: true })).toBe(false);
    expect(isAdmin({ email: "", emailVerified: true })).toBe(false);
  });
});

describe("hideKeys", () => {
  it("blanks API keys quoted in provider errors and keeps the rest", async () => {
    const { hideKeys } = await import("../src/lib/analytics.js");
    expect(hideKeys("Incorrect API key provided: sk-proj-abc****pI0A. You can find your API key at x.")).toBe(
      "Incorrect API key provided: sk-…. You can find your API key at x.",
    );
    expect(hideKeys("rate limited")).toBe("rate limited");
    expect(hideKeys(null)).toBeNull();
  });
});
