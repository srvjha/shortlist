import { Router } from "express";
import { sendData } from "../../lib/http.js";
import { requireAdmin } from "../../middleware/require-admin.js";
import { currentUser, requireAuth } from "../../middleware/require-auth.js";
import { validated } from "../../middleware/validate.js";
import {
  adminAiResponse,
  adminApiResponse,
  adminContentQuery,
  adminContentResponse,
  adminOverviewResponse,
  adminRangeQuery,
  adminRevenueResponse,
  adminSubscriptionParams,
  adminSystemResponse,
  adminTrafficResponse,
  adminUserListResponse,
  adminUserParams,
  adminUserResponse,
  adminUsersQuery,
  createAdminSubscriptionBody,
  updateAdminUserBody,
} from "./admin.schemas.js";
import * as admin from "./admin.service.js";
import { getApiReport, getTraffic } from "./posthog.js";

export const adminRouter = Router();

adminRouter.use("/admin", requireAuth, requireAdmin);

adminRouter.get(
  "/admin/overview",
  ...validated({ query: adminRangeQuery }, async (req, res) => {
    sendData(res, adminOverviewResponse, await admin.getOverview(req.query.days, req.query.timeZone));
  }),
);

adminRouter.get(
  "/admin/users",
  ...validated({ query: adminUsersQuery }, async (req, res) => {
    sendData(res, adminUserListResponse, await admin.listUsers(req.query));
  }),
);

adminRouter.get(
  "/admin/users/:userId",
  ...validated({ params: adminUserParams }, async (req, res) => {
    sendData(res, adminUserResponse, await admin.getUser(req.params.userId));
  }),
);

adminRouter.patch(
  "/admin/users/:userId",
  ...validated({ params: adminUserParams, body: updateAdminUserBody }, async (req, res) => {
    await admin.setSuspended(currentUser(req).id, req.params.userId, req.body.suspended);
    sendData(res, adminUserResponse, await admin.getUser(req.params.userId));
  }),
);

adminRouter.delete(
  "/admin/users/:userId/sessions",
  ...validated({ params: adminUserParams }, async (req, res) => {
    await admin.revokeSessions(currentUser(req).id, req.params.userId);
    res.status(204).end();
  }),
);

adminRouter.delete(
  "/admin/users/:userId/usage",
  ...validated({ params: adminUserParams }, async (req, res) => {
    await admin.resetUsage(currentUser(req).id, req.params.userId);
    res.status(204).end();
  }),
);

adminRouter.post(
  "/admin/users/:userId/subscriptions",
  ...validated({ params: adminUserParams, body: createAdminSubscriptionBody }, async (req, res) => {
    await admin.grantSubscription(currentUser(req).id, req.params.userId, req.body.plan, req.body.months);
    sendData(res, adminUserResponse, await admin.getUser(req.params.userId), 201);
  }),
);

adminRouter.delete(
  "/admin/users/:userId/subscriptions/:subscriptionId",
  ...validated({ params: adminSubscriptionParams }, async (req, res) => {
    await admin.revokeSubscription(currentUser(req).id, req.params.userId, req.params.subscriptionId);
    res.status(204).end();
  }),
);

adminRouter.get(
  "/admin/ai",
  ...validated({ query: adminRangeQuery }, async (req, res) => {
    sendData(res, adminAiResponse, await admin.getAiUsage(req.query.days, req.query.timeZone));
  }),
);

adminRouter.get(
  "/admin/revenue",
  ...validated({ query: adminRangeQuery }, async (req, res) => {
    sendData(res, adminRevenueResponse, await admin.getRevenue(req.query.days, req.query.timeZone));
  }),
);

adminRouter.get(
  "/admin/content",
  ...validated({ query: adminContentQuery }, async (req, res) => {
    sendData(res, adminContentResponse, await admin.getContent(req.query.days));
  }),
);

adminRouter.get(
  "/admin/traffic",
  ...validated({ query: adminRangeQuery }, async (req, res) => {
    sendData(res, adminTrafficResponse, await getTraffic(req.query.days, req.query.timeZone));
  }),
);

adminRouter.get(
  "/admin/api",
  ...validated({ query: adminRangeQuery }, async (req, res) => {
    sendData(res, adminApiResponse, await admin.withEmails(await getApiReport(req.query.days, req.query.timeZone)));
  }),
);

adminRouter.get("/admin/system", async (_req, res) => {
  sendData(res, adminSystemResponse, await admin.getSystem());
});
