import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { captureError } from "../lib/analytics.js";
import { AppError } from "../lib/errors.js";
import { routePattern } from "./request-metrics.js";

function hasType(err: unknown): err is { type: string } {
  return typeof err === "object" && err !== null && "type" in err;
}

function hasCode(err: unknown, code: string): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === code;
}

function isUniqueViolation(err: unknown): boolean {
  const cause = typeof err === "object" && err !== null && "cause" in err ? err.cause : undefined;
  return hasCode(err, "23505") || hasCode(cause, "23505");
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  // Errors thrown by express.json() while reading the body.
  if (hasType(err) && err.type === "entity.parse.failed") {
    res.status(400).json({ error: { code: "INVALID_JSON", message: "Request body is not valid JSON" } });
    return;
  }
  if (hasType(err) && err.type === "entity.too.large") {
    res.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large" } });
    return;
  }

  // Upload problems, such as a file over the size limit or a wrong field name.
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "Files can be at most 5 MB" : err.message;
    res.status(400).json({ error: { code: "UPLOAD_ERROR", message } });
    return;
  }

  // A unique constraint lost a race, such as two requests taking the same username or slug (Postgres 23505).
  if (isUniqueViolation(err)) {
    res.status(409).json({
      error: { code: "CONFLICT", message: "That already exists. Try a different name, or refresh and try again." },
    });
    return;
  }

  req.log.error({ err }, "Unhandled error");
  captureError(err, { method: req.method, route: routePattern(req), user_id: req.user?.id ?? null });
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
  });
}
