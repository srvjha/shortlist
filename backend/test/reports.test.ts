import { describe, expect, it, vi } from "vitest";

const query = (result: unknown) => {
  const q: Record<string, unknown> = {};
  for (const name of ["values", "returning"]) q[name] = () => q;
  q.then = (resolve: (v: unknown) => void) => resolve(result);
  return q;
};

const insert = vi.hoisted(() => vi.fn());
vi.mock("../src/db/index.js", () => ({ db: { insert } }));
const sendEmail = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/email.js", () => ({ sendEmail }));

import { createReport } from "../src/modules/reports/reports.service.js";

describe("problem reports", () => {
  it("needs an email from signed-out visitors", async () => {
    await expect(createReport(undefined, { description: "Login fails" }, undefined)).rejects.toThrow(/email/);
    expect(insert).not.toHaveBeenCalled();
  });

  it("saves the report and emails it, replying to the user", async () => {
    insert.mockReturnValue(query([{ id: "11111111-1111-4111-8111-111111111111" }]));
    sendEmail.mockResolvedValue(true);
    await createReport(
      { id: "user_1", email: "a@example.com" },
      { description: "Tailoring broke", error: { message: "Something went wrong.", code: "UNKNOWN", status: 500 } },
      "Firefox",
    );
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        replyTo: "a@example.com",
        subject: "Problem report: Something went wrong.",
        text: expect.stringContaining("Code: UNKNOWN, status: 500"),
      }),
    );
  });

  it("still succeeds when the email can't be sent", async () => {
    insert.mockReturnValue(query([{ id: "11111111-1111-4111-8111-111111111111" }]));
    sendEmail.mockRejectedValue(new Error("Resend down"));
    await expect(
      createReport(undefined, { description: "Broken", email: "b@example.com" }, undefined),
    ).resolves.toEqual({
      id: "11111111-1111-4111-8111-111111111111",
    });
  });
});
