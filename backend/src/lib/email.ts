import { env } from "../config/env.js";

// Returns false when email isn't set up.
export async function sendEmail(input: { to: string[]; subject: string; text: string; replyTo?: string }) {
  if (!env.RESEND_API_KEY || input.to.length === 0) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      ...(input.replyTo && { reply_to: input.replyTo }),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Resend answered ${response.status}: ${await response.text()}`);
  return true;
}
