import type { AddressInfo } from "node:net";
import express from "express";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ publicRunsToday: 0 }));
const generateStructured = vi.hoisted(() => vi.fn());

vi.mock("../src/lib/ai/generate.js", () => ({ generateStructured }));
vi.mock("../src/lib/analytics.js", () => ({ track: vi.fn(), trackServer: vi.fn(), captureError: vi.fn() }));
vi.mock("../src/db/index.js", () => {
  const query = () => {
    const q: Record<string, unknown> = {};
    for (const name of ["from", "where"]) q[name] = () => q;
    q.then = (resolve: (v: unknown) => void) => resolve([{ value: state.publicRunsToday }]);
    return q;
  };
  return { db: { select: query } };
});

const { lettersRouter } = await import("../src/modules/letters/letters.routes.js");
const { errorHandler } = await import("../src/middleware/error-handler.js");

const app = express();
app.set("trust proxy", true);
app.use(express.json({ limit: "1mb" }));
app.use("/v1", lettersRouter);
app.use(errorHandler);
const server = app.listen(0);
const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1/public/cover-letters`;
afterAll(() => server.close());

const send = (body: object, ip: string) =>
  fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
const valid = { resumeText: "Ran email campaigns. ".repeat(20), jobDescription: "Marketing role. ".repeat(10) };

describe("POST /v1/public/cover-letters", () => {
  beforeEach(() => {
    state.publicRunsToday = 0;
    generateStructured.mockReset();
    generateStructured.mockImplementation(async ({ step }: { step: string }) =>
      step === "verify"
        ? { data: { unsupported: [] }, runId: "run_2" }
        : {
            data: {
              greeting: "Dear Hiring Manager,",
              paragraphs: ["I ran email campaigns."],
              company: null,
              role: null,
              name: null,
            },
            runId: "run_1",
          },
    );
  });

  it("writes a letter with no account and doesn't charge any quota", async () => {
    const res = await send(valid, "10.0.0.1");
    expect(res.status).toBe(201);
    const { data } = (await res.json()) as { data: { body: string; flags: string[] } };
    expect(data.body).toContain("I ran email campaigns.");
    expect(generateStructured).toHaveBeenCalledWith(expect.objectContaining({ userId: null }));
  });

  it("refuses oversized and too-short text before calling the model", async () => {
    const big = await send({ ...valid, resumeText: "x".repeat(15_001) }, "10.0.0.2");
    const short = await send({ ...valid, jobDescription: "short" }, "10.0.0.2");
    expect([big.status, short.status]).toEqual([400, 400]);
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it("stops everyone with no account once the day's budget is spent", async () => {
    state.publicRunsToday = 200;
    const res = await send(valid, "10.0.0.3");
    expect(res.status).toBe(503);
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it("limits one visitor to 3 requests an hour", async () => {
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await send(valid, "10.0.0.4")).status);
    expect(statuses).toEqual([201, 201, 201, 429]);
    expect((await send(valid, "10.0.0.5")).status).toBe(201);
  });
});
