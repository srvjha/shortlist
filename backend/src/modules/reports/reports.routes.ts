import { Router } from "express";
import { sendData } from "../../lib/http.js";
import { reportLimiter } from "../../middleware/rate-limit.js";
import { validated } from "../../middleware/validate.js";
import { createReportBody, reportResponse } from "./reports.schemas.js";
import { createReport } from "./reports.service.js";

export const reportsRouter = Router();

// Open to signed-out visitors too, since sign-in itself can be what fails.
reportsRouter.post(
  "/reports",
  reportLimiter,
  ...validated({ body: createReportBody }, async (req, res) => {
    sendData(res, reportResponse, await createReport(req.user, req.body, req.get("user-agent")), 201);
  }),
);
