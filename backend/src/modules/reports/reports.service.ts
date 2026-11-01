import type { z } from "zod";
import { env } from "../../config/env.js";
import { db } from "../../db/index.js";
import { reports } from "../../db/schema/index.js";
import { sendEmail } from "../../lib/email.js";
import { AppError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import type { createReportBody } from "./reports.schemas.js";

export async function createReport(
  user: { id: string; email: string } | undefined,
  input: z.output<typeof createReportBody>,
  userAgent: string | undefined,
) {
  // Guests have a made-up account email, so one they type wins.
  const email = input.email ?? user?.email;
  if (!email) throw new AppError(400, "EMAIL_REQUIRED", "Add your email so we can reply.");
  const [report] = await db
    .insert(reports)
    .values({
      userId: user?.id ?? null,
      email,
      description: input.description,
      page: input.page ?? null,
      userAgent: userAgent?.slice(0, 500) ?? null,
      errorMessage: input.error?.message ?? null,
      errorCode: input.error?.code ?? null,
      errorStatus: input.error?.status ?? null,
      errorPath: input.error?.path ?? null,
    })
    .returning({ id: reports.id });

  // Saved already, so a failed email loses nothing; the user isn't kept waiting on it.
  sendEmail({
    to: env.ADMIN_EMAILS,
    replyTo: email,
    subject: `Problem report${input.error ? `: ${input.error.message.slice(0, 80)}` : ""}`,
    text: [
      `From: ${email}${user ? ` (${env.FRONTEND_URL}/admin/users/${user.id})` : " (signed out)"}`,
      `Page: ${input.page ?? "unknown"}`,
      "",
      input.description,
      ...(input.error
        ? [
            "",
            "Error shown:",
            `  ${input.error.message}`,
            `  Code: ${input.error.code ?? "none"}, status: ${input.error.status ?? "none"}`,
            `  API call: ${input.error.path ?? "unknown"}`,
          ]
        : []),
      "",
      `Browser: ${userAgent ?? "unknown"}`,
      `Report ID: ${report!.id}`,
    ].join("\n"),
  }).catch((err: unknown) => logger.error({ err, reportId: report!.id }, "Could not email a problem report"));

  return report!;
}
