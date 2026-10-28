import { AsyncLocalStorage } from "node:async_hooks";
import type { NextFunction, Request, Response } from "express";
import { trackServer } from "../lib/analytics.js";

// The matched pattern (/v1/resumes/:resumeId), never the real path, which holds ids. Express clears
// baseUrl when a route passes an error on, so the /v1 mount is restored from the original URL then.
export function routePattern(req: Request) {
  if (!req.route) return "unmatched";
  const base = req.baseUrl || (req.originalUrl.startsWith("/v1/") ? "/v1" : "");
  return `${base}${String(req.route.path)}`;
}

// Steps inside a request (compile, cache lookup, AI) add their time here, so a slow request shows where it went.
const steps = new AsyncLocalStorage<Record<string, number | boolean>>();

// Durations add up, since one request can make several AI calls; flags like a cache hit are set as they are.
export function recordStep(name: string, value: number | boolean) {
  const store = steps.getStore();
  if (!store) return;
  store[name] = typeof value === "number" ? Math.round(((store[name] as number | undefined) ?? 0) + value) : value;
}

export async function timed<T>(name: string, run: () => Promise<T>): Promise<T> {
  const started = performance.now();
  try {
    return await run();
  } finally {
    recordStep(name, performance.now() - started);
  }
}

export function requestMetrics(req: Request, res: Response, next: NextFunction) {
  if (req.path.startsWith("/health")) return next();
  const started = process.hrtime.bigint();
  const store: Record<string, number | boolean> = {};
  res.on("finish", () => {
    // ponytail: every request is recorded, fine while traffic is far inside PostHog's free million events a
    // month. If it nears that, sample fast successes again: the admin queries weight each event by 1 / sample_rate.
    trackServer("api_request", {
      method: req.method,
      route: routePattern(req),
      status: res.statusCode,
      duration_ms: Math.round(Number(process.hrtime.bigint() - started) / 1e6),
      sample_rate: 1,
      user_id: req.user?.id ?? null,
      ...store,
    });
  });
  steps.run(store, next);
}
