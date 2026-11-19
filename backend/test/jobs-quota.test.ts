import { describe, expect, it, vi } from "vitest";

// A Drizzle-like query: every builder method returns itself, and awaiting it gives `result`.
const query = (result: unknown) => {
  const q: Record<string, unknown> = {};
  for (const name of ["values", "returning", "from", "where", "limit", "orderBy"]) q[name] = () => q;
  q.then = (resolve: (v: unknown) => void) => resolve(result);
  return q;
};

vi.mock("../src/db/index.js", () => ({
  db: { select: () => query([]), insert: () => query([{ id: "job_1" }]) },
}));
vi.mock("../src/lib/analytics.js", () => ({ track: vi.fn() }));
const generateStructured = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/ai/generate.js", () => ({ generateStructured }));

import { createJob } from "../src/modules/jobs/jobs.service.js";

describe("job creation", () => {
  it("meters the requirement parse against the job quota", async () => {
    generateStructured.mockResolvedValue({ data: { company: null, role: null, requirements: [] }, runId: "run_1" });
    await createJob("user_1", { rawText: "Backend engineer. ".repeat(20) });
    expect(generateStructured).toHaveBeenCalledWith(expect.objectContaining({ step: "jd_parse", quota: "job" }));
  });

  it("reads a short entry as the role someone is aiming for", async () => {
    generateStructured.mockClear();
    generateStructured.mockResolvedValue({ data: { company: null, role: "Full stack engineer" }, runId: "run_2" });
    await createJob("user_1", { rawText: "I am aiming for full stack engineer roles" });
    const call = generateStructured.mock.calls[0]![0] as { system: string; prompt: string; quota: string };
    expect(call.prompt).toContain("<role>");
    expect(call.system).toContain("only the role");
    expect(call.quota).toBe("job");
  });
});
