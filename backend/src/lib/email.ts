import { env } from "../config/env.js";

// One request per recipient: Resend rejects the whole email if any address is refused (its test sender only
// delivers to the account owner), and one bad address shouldn't stop the rest.
// Returns false when email isn't set up; throws if any recipient failed.
export async function sendEmail(input: { to: string[]; subject: string; text: string; replyTo?: string }) {
  if (!env.RESEND_API_KEY || input.to.length === 0) return false;
  const results = await Promise.allSettled(
    input.to.map(async (to) => {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: [to],
          subject: input.subject,
          text: input.text,
          ...(input.replyTo && { reply_to: input.replyTo }),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`Resend refused ${to} (${response.status}): ${await response.text()}`);
    }),
  );
  const failed = results.filter((result) => result.status === "rejected");
  if (failed.length > 0)
    throw new AggregateError(
      failed.map((result) => result.reason),
      "Some emails were not sent",
    );
  return true;
}
