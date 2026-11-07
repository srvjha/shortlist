import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { env } from "../config/env.js";

const sameSecret = (given: string, secret: string) => {
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
};

// Share and profile pages render on the frontend's server, so every visitor would arrive from its one IP and share
// one limit. With the shared secret, the frontend passes the visitor's own IP; without it the header is ignored.
export function clientIp(req: Request, secret = env.PROXY_SECRET) {
  const given = req.get("x-shortlist-proxy");
  const forwarded = req.get("x-shortlist-client-ip")?.trim().slice(0, 64);
  if (secret && given && forwarded && sameSecret(given, secret)) return forwarded;
  return req.ip ?? "unknown";
}

// ponytail: counts live in this process's memory, which is exact while one API process runs.
// Running several API processes needs a shared store (a Postgres table) so their counts add up.
function limiter(windowMs: number, limit: number) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    // Signed-in users are limited per account, everyone else per IP.
    keyGenerator: (req: Request) => req.user?.id ?? ipKeyGenerator(clientIp(req)),
    handler: (_req, res) => {
      res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many requests. Try again in a minute." } });
    },
  });
}

const minute = 60_000;

export const apiLimiter = limiter(minute, 300);
export const publicLimiter = limiter(minute, 120);
export const compileLimiter = limiter(minute, 30);
export const aiLimiter = limiter(minute, 10);
export const atsLimiter = limiter(10 * minute, 10);
// Each request is a real AI call on our key, for anyone with no account.
export const publicLetterLimiter = limiter(60 * minute, 3);
// Slows anyone guessing promo codes.
export const redeemLimiter = limiter(10 * minute, 10);
export const reportLimiter = limiter(10 * minute, 5);
export const uploadLimiter = limiter(10 * minute, 20);
// Counts only wrong share-link and contact passwords, per link, so a crowd of visitors cannot brute-force one link.
// A wrong contact password still answers 200 with the contacts locked, so the route flags it in res.locals.
export const sharePasswordLimiter = rateLimit({
  windowMs: 15 * minute,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  requestWasSuccessful: (_req, res) => res.statusCode < 400 && !res.locals.wrongPassword,
  skip: (req: Request) => !req.get("x-share-password") && !req.get("x-share-contact-password"),
  keyGenerator: (req: Request) => `${req.params.username}/${req.params.slug}`.toLowerCase(),
  handler: (_req, res) => {
    res
      .status(429)
      .json({ error: { code: "RATE_LIMITED", message: "Too many wrong passwords. Try again in 15 minutes." } });
  },
});
