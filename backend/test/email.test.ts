import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/config/env.js", () => ({ env: { RESEND_API_KEY: "re_test", EMAIL_FROM: "Shortlist <a@b.c>" } }));

import { sendEmail } from "../src/lib/email.js";

afterEach(() => vi.unstubAllGlobals());

describe("sendEmail", () => {
  it("still delivers to the other addresses when Resend refuses one", async () => {
    const fetch = vi.fn(async (_url: string, init: RequestInit) => {
      const [to] = JSON.parse(init.body as string).to;
      return new Response("{}", { status: to === "refused@example.com" ? 403 : 200 });
    });
    vi.stubGlobal("fetch", fetch);
    await expect(
      sendEmail({ to: ["owner@example.com", "refused@example.com"], subject: "s", text: "t" }),
    ).rejects.toThrow("Some emails were not sent");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
