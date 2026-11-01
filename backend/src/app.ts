import cors from "cors";
import express from "express";
import helmet from "helmet";
import { toNodeHandler } from "better-auth/node";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { auth } from "./lib/auth.js";
import { paymentWebhookRouter } from "./modules/billing/billing.routes.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import { optionalAuth } from "./middleware/optional-auth.js";
import { apiLimiter } from "./middleware/rate-limit.js";
import { buildOpenApiDocument } from "./openapi.js";
import { v1 } from "./routes.js";
import { requestMetrics } from "./middleware/request-metrics.js";
import { sql } from "drizzle-orm";
import { db } from "./db/index.js";
import { compilerHealth } from "./modules/admin/admin.service.js";

export const app = express();

// In production the app sits behind Caddy; trust its X-Forwarded-* headers for client IPs.
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url?.startsWith("/health") ?? false } }));
app.use(requestMetrics);

// Better Auth reads the raw request body, so it is mounted before express.json().
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(paymentWebhookRouter);
app.use(express.json({ limit: "1mb" }));

// The API is not a website: keep every response (shared PDFs included) out of search results.
app.use((_req, res, next) => {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  next();
});
app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send("User-agent: *\nDisallow: /\n");
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// For uptime monitors: also checks Postgres and the compiler, and answers 503 if either is down.
app.get("/health/deep", async (_req, res) => {
  const [database, compiler] = await Promise.all([
    db.execute(sql`select 1`).then(
      () => true,
      () => false,
    ),
    compilerHealth().then((result) => result.ok),
  ]);
  res
    .status(database && compiler ? 200 : 503)
    .json({ status: database && compiler ? "ok" : "degraded", database, compiler });
});

const openApiDocument = buildOpenApiDocument();
app.get("/v1/openapi.json", (_req, res) => {
  res.json(openApiDocument);
});

// The session is read first so signed-in users are limited per account: a whole campus on one Wi-Fi
// shares an IP.
app.use("/v1", optionalAuth, apiLimiter, v1);

app.use(notFound);
app.use(errorHandler);
