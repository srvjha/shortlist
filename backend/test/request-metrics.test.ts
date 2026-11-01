import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";

const sent: Record<string, unknown>[] = [];
vi.mock("../src/lib/analytics.js", () => ({
  trackServer: (_: string, props: Record<string, unknown>) => sent.push(props),
}));
const { recordStep, requestMetrics, timed } = await import("../src/middleware/request-metrics.js");

describe("request step timings", () => {
  it("adds the time of steps inside a request to its api_request event", async () => {
    const res = Object.assign(new EventEmitter(), { statusCode: 500 });
    const req = {
      path: "/v1/previews",
      method: "POST",
      route: { path: "/previews" },
      baseUrl: "/v1",
      originalUrl: "/v1/previews",
      user: { id: "user_1" },
    };
    await new Promise<void>((resolve) =>
      requestMetrics(req as never, res as never, async () => {
        await timed("compile_ms", () => new Promise((r) => setTimeout(r, 20)));
        recordStep("ai_ms", 5);
        recordStep("ai_ms", 7);
        recordStep("compile_cached", false);
        resolve();
      }),
    );
    res.emit("finish");
    expect(sent[0]).toMatchObject({ route: "/v1/previews", ai_ms: 12, compile_cached: false, user_id: "user_1" });
    expect(sent[0]!.compile_ms).toBeGreaterThanOrEqual(19);
  });
});

describe("routePattern", async () => {
  const { routePattern } = await import("../src/middleware/request-metrics.js");
  it("adds the /v1 mount once, even for routes that carry it in their own path", () => {
    const req = (path: string, originalUrl: string) => ({ route: { path }, baseUrl: "", originalUrl }) as never;
    expect(routePattern(req("/resumes/:resumeId", "/v1/resumes/1"))).toBe("/v1/resumes/:resumeId");
    expect(routePattern(req("/v1/webhooks/polar", "/v1/webhooks/polar"))).toBe("/v1/webhooks/polar");
  });
});
