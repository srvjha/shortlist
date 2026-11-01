import { z } from "zod";

export const createReportBody = z.object({
  description: z.string().trim().min(3).max(4000),
  // Required when signed out, so we can reply. Used instead of the account email when given.
  email: z.email().max(320).optional(),
  page: z.string().max(500).optional(),
  // The error the user was shown, when reporting from it.
  error: z
    .object({
      message: z.string().max(1000),
      code: z.string().max(100).optional(),
      status: z.number().int().optional(),
      path: z.string().max(500).optional(),
    })
    .optional(),
});

export const reportResponse = z.object({ id: z.uuid() });
