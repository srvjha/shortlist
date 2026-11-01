import { pino } from "pino";
import { env } from "../config/env.js";

// Request logs include every header. Sessions, passwords and signatures must never reach a log, and the
// privacy policy promises IP addresses are never stored.
const redacted = [
  "cookie",
  "authorization",
  '["x-share-password"]',
  '["x-share-contact-password"]',
  '["x-razorpay-signature"]',
  '["webhook-signature"]',
  '["x-share-visitor"]',
  '["x-shortlist-proxy"]',
  '["x-shortlist-client-ip"]',
  '["x-forwarded-for"]',
  '["x-real-ip"]',
  '["cf-connecting-ip"]',
];

export const redact = {
  paths: [
    ...redacted.map((header) => (header.startsWith("[") ? `req.headers${header}` : `req.headers.${header}`)),
    'res.headers["set-cookie"]',
    "req.remoteAddress",
  ],
  censor: "[redacted]",
};

export const logger = pino({
  level: env.LOG_LEVEL,
  redact,
  ...(env.NODE_ENV === "development" && {
    transport: { target: "pino-pretty", options: { colorize: true } },
  }),
});
