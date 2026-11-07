import { Router } from "express";
import { z } from "zod";
import { sendData } from "../../lib/http.js";
import { currentUser, requireAuth } from "../../middleware/require-auth.js";
import { getUsage } from "./quotas.js";

const counter = z.object({ used: z.number().int(), limit: z.number().int() });
export const usageResponse = z.object({
  plan: z.enum(["free", "season_pass", "pro", "lifetime"]),
  // AI requests run on the user's own key, so the AI limits below don't apply.
  ownAiKey: z.boolean(),
  periodStart: z.date(),
  periodEnd: z.date(),
  resumes: counter,
  // On Free, tailor, edit and draft count for all time, not per month.
  tailor: counter,
  edit: counter,
  import: counter,
  // Resumes written by AI from the user's notes.
  draft: counter,
  // PDF downloads, on Free only; paid plans get null.
  pdf: counter.nullable(),
});

export const usageRouter = Router();

usageRouter.get("/usage", requireAuth, async (req, res) => {
  sendData(res, usageResponse, await getUsage(currentUser(req).id));
});
