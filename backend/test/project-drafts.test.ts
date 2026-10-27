import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/db/index.js", () => ({ db: {} }));
vi.mock("../src/lib/analytics.js", () => ({ track: vi.fn() }));
vi.mock("../src/modules/usage/quotas.js", () => ({ assertAiQuota: vi.fn() }));
const generateStructured = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/ai/generate.js", () => ({ generateStructured }));

import { createProjectDraft } from "../src/modules/imports/project-drafts.js";

const ok = (body: unknown) => new Response(typeof body === "string" ? body : JSON.stringify(body));
const readme = "# Shortlist\nAn AI resume builder that tailors a resume to each job description. ".repeat(3);

afterEach(() => vi.unstubAllGlobals());

describe("project drafts", () => {
  it("reads a GitHub repo through the API and flags terms the source never mentions", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/languages")) return ok({ TypeScript: 900, CSS: 10 });
      if (url.endsWith("/readme")) return ok(readme);
      return ok({
        full_name: "srvjha/shortlist",
        description: "AI resume builder",
        homepage: null,
        topics: ["resume"],
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    generateStructured.mockResolvedValue({
      data: {
        name: "Shortlist",
        technologies: ["TypeScript"],
        bullets: ["Built an AI resume builder", "Served 10k users with Kubernetes"],
      },
      runId: "00000000-0000-4000-8000-000000000000",
    });

    const { project } = await createProjectDraft("user_1", { url: "https://github.com/srvjha/shortlist" });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.github.com/repos/srvjha/shortlist",
      "https://api.github.com/repos/srvjha/shortlist/languages",
      "https://api.github.com/repos/srvjha/shortlist/readme",
    ]);
    const prompt = generateStructured.mock.calls[0]![0].prompt as string;
    expect(prompt).toContain("Languages: TypeScript, CSS");
    expect(project.url).toBe("https://github.com/srvjha/shortlist");
    expect(project.bullets[0]!.flags).toEqual([]);
    expect(project.bullets[1]!.flags).toEqual(expect.arrayContaining(["10k", "Kubernetes"]));
  });

  it("falls back to reading the page when the repo is private", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.startsWith("https://r.jina.ai/") ? ok(readme) : new Response("Not Found", { status: 404 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    generateStructured.mockResolvedValue({ data: { name: "Shortlist", technologies: [], bullets: [] }, runId: "r" });

    await createProjectDraft("user_1", { url: "https://github.com/srvjha/private-thing" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://r.jina.ai/https://github.com/srvjha/private-thing",
      expect.anything(),
    );
  });
});
