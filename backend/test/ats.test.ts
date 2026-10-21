import { describe, expect, it, vi } from "vitest";
import { compileTex } from "../src/lib/latex/compile.js";
import type { TextItem } from "../src/modules/ats/parser/types.js";
import { parsePdfItems, parseTex, scoreResume, texToText } from "../src/modules/ats/scoring.js";
import { atsReport } from "../src/modules/ats/ats.schemas.js";
import { resumeContentSchema } from "../src/schemas/resume-content.js";

const strong = `Aarav Sharma
Backend Engineer
aarav.sharma@example.com | +91 98765 43210 | Bengaluru, India
linkedin.com/in/aarav-sharma | github.com/aarav

Experience
Software Engineer, Razorpay | Jul 2022 - Present
• Built a payments reconciliation service in Go and PostgreSQL that matches 2M transactions a day
• Reduced p95 API latency from 480ms to 120ms by adding Redis caching and query indexes
• Led a team of 3 engineers to migrate 40 cron jobs to Kafka consumers, cutting failures by 60%
• Designed REST APIs used by 12 internal teams, with OpenAPI docs and contract tests
Software Engineering Intern, Zoho | Jan 2022 - Jun 2022
• Shipped a CSV import tool in Node.js that saved support 15 hours a week
• Wrote 120 unit tests with Jest, raising coverage from 45% to 82%

Projects
Ledger, an open source double-entry ledger | github.com/aarav/ledger
• Implemented idempotent writes in TypeScript and PostgreSQL, handling 5k requests per second in load tests
• Deployed on AWS with Docker and GitHub Actions, used by 300 developers

Education
B.Tech in Computer Science, IIT Delhi | 2018 - 2022 | CGPA 8.7/10

Skills
Languages: Go, TypeScript, Python, SQL
Backend: Node.js, PostgreSQL, Redis, Kafka, Docker, AWS
Practices: System Design, Unit Testing, CI/CD

Achievements
• Ranked 312 of 25,000 in Google Kick Start 2021
`;

const weak = `Rohan
I am a hard working team player and quick learner who is passionate about technology and wants to work in a dynamic company where I can grow my skills and contribute to the success of the organisation. I have done many projects in college and I am good at coding and problem solving and I believe I will be an asset to any team that I join in the future.

Hobbies
Cricket, music, travelling and reading books about many different subjects in my free time.
`;

vi.mock("../src/lib/latex/compile.js", () => ({ compileTex: vi.fn() }));

const jobText = (title: string) => `${title}

Requirements:
- 2+ years building services in Go and PostgreSQL
- Hands-on experience with Kubernetes
- Strong communication skills
- Must be based in Bengaluru or willing to relocate

Nice to have:
- Kafka, GraphQL and Redis
`;
const job = jobText("Backend Platform Engineer");
const checksOf = (report: ReturnType<typeof scoreResume>, category: string) =>
  Object.fromEntries(report.categories.find((c) => c.id === category)!.checks.map((c) => [c.id, c]));

describe("scoreResume", () => {
  it("scores a strong resume high and a weak one low", () => {
    const high = scoreResume({ text: strong });
    const low = scoreResume({ text: weak });
    expect(high.score).toBeGreaterThanOrEqual(85);
    expect(high.grade).toBe("excellent");
    expect(low.score).toBeLessThan(40);
    expect(low.grade).toBe("poor");
    expect(atsReport.parse(high)).toEqual(high);
    expect(high.stats).toMatchObject({ bullets: 9, quantifiedBullets: 9 });
    expect(high.stats.sections).toEqual(["experience", "projects", "education", "skills", "achievements"]);
  });

  it("gives the same report for the same input", () => {
    expect(scoreResume({ text: strong, jobText: job })).toEqual(scoreResume({ text: strong, jobText: job }));
  });

  it("leaves fix null on passing checks and gives one on the rest", () => {
    for (const report of [scoreResume({ text: strong }), scoreResume({ text: weak, jobText: job })]) {
      for (const check of report.categories.flatMap((c) => c.checks)) {
        if (check.status === "pass") expect(check.fix).toBeNull();
        else expect(check.fix).toBeTruthy();
      }
    }
    const fixes = scoreResume({ text: weak, jobText: job }).categories.flatMap((c) =>
      c.checks.map((check) => check.fix ?? ""),
    );
    expect(fixes.join(" ")).not.toMatch(/[\u2013\u2014]/);
  });

  it("matches the job's skills and re-weights without a job", () => {
    const withJob = scoreResume({ text: strong, jobText: job });
    expect(atsReport.parse(withJob)).toEqual(withJob);
    expect(withJob.keywords).toEqual({
      matched: ["Go", "PostgreSQL", "Kafka", "Redis"],
      missing: ["Kubernetes", "GraphQL"],
      hard: { matched: ["Go", "PostgreSQL", "Kafka", "Redis"], missing: ["Kubernetes", "GraphQL"] },
      soft: { matched: [], missing: ["Communication"] },
      mustHaveMissing: ["Kubernetes"],
      implied: [],
    });
    expect(withJob.categories.map((c) => c.maxScore)).toEqual([15, 10, 15, 25, 10, 25]);
    const checks = checksOf(withJob, "job");
    expect(Object.keys(checks)).toEqual([
      "must-have",
      "hard-skills",
      "soft-skills",
      "job-title",
      "title-headline",
      "acronyms",
    ]);
    expect(checks["must-have"]!.status).toBe("fail");
    expect(checks["must-have"]!.fix).toContain("Kubernetes");
    expect(checks["soft-skills"]!.status).toBe("warn");

    const without = scoreResume({ text: strong });
    expect(without).toMatchObject({ keywords: null, title: null, knockouts: null, parse: null });
    expect(without.categories.map((c) => c.id)).not.toContain("job");
    expect(without.categories.reduce((sum, c) => sum + c.maxScore, 0)).toBe(100);
  });

  it("checks the job's title against the resume's headline and roles", () => {
    const level = (title: string) => {
      const report = scoreResume({ text: strong, jobText: jobText(title) });
      return [report.title?.level, checksOf(report, "job")["job-title"]!];
    };
    expect(level("Senior Backend Developer")).toMatchObject(["exact", { status: "pass" }]);
    expect(level("Backend Platform Engineer")).toMatchObject(["close", { status: "warn" }]);
    expect(level("Data Analyst")).toMatchObject([
      "none",
      { status: "fail", fix: "Use the job's title, Data Analyst, in your headline if it's true for you." },
    ]);
  });

  it("lists knockout requirements only with a job, without changing the score", () => {
    const report = scoreResume({ text: strong, jobText: job });
    expect(report.knockouts!.map((k) => [k.id, k.status])).toContainEqual(["location", "met"]);
    const noKnockouts = scoreResume({ text: strong, jobText: job.replace(/^- Must be based.*\n/m, "") });
    expect(noKnockouts.knockouts!.some((k) => k.id === "location")).toBe(false);
    expect(noKnockouts.score).toBe(report.score);
  });

  it("uses the parser's reading of a PDF for the format checks", () => {
    const page = { width: 595, height: 842 };
    const item = (text: string, y: number, extra: Partial<TextItem> = {}): TextItem => ({
      text,
      x: 40,
      y,
      width: text.length * 5,
      height: 10,
      page: 1,
      ...extra,
    });
    const items = strong
      .split("\n")
      .filter((line) => line.trim())
      .map((line, i) => item(line, 60 + i * 14, i === 0 ? { height: 20, bold: true } : {}));
    const expected = {
      name: "Aarav Sharma",
      email: "aarav.sharma@example.com",
      sectionKinds: ["experience", "skills"],
    };
    const parse = parsePdfItems(items, page, expected)!;
    const report = scoreResume({ text: strong, parse });
    expect(atsReport.parse(report)).toEqual(report);
    const checks = checksOf(report, "parsing");
    expect(Object.keys(checks)).toEqual([
      "parse-rate",
      "contact",
      "columns",
      "glyphs",
      "sections",
      "jobs",
      "name",
      "density",
      "date-format",
    ]);
    expect(checks["parse-rate"]!.status).toBe("pass");
    expect(report.parse).toMatchObject({
      parseRate: 1,
      fields: expect.arrayContaining([expect.objectContaining({ id: "name", ok: true })]),
    });
    expect(checksOf(report, "sections").headings).toBeUndefined();

    // Pasted text keeps the text-based checks; a PDF without expected values has no parse rate.
    expect(Object.keys(checksOf(scoreResume({ text: strong }), "parsing"))).toEqual([
      "readable",
      "characters",
      "icons",
      "dates",
      "date-format",
    ]);
    const unexpected = parsePdfItems(items, page)!;
    expect(unexpected.parseRate).toBeNull();
    expect(Object.keys(checksOf(scoreResume({ text: strong, parse: unexpected }), "parsing"))).not.toContain(
      "parse-rate",
    );
  });

  it("scores without the parser when compiling fails", async () => {
    vi.mocked(compileTex).mockRejectedValueOnce(new Error("timed out"));
    expect(await parseTex("\\documentclass{article}")).toBeNull();
    vi.mocked(compileTex).mockResolvedValueOnce({ ok: false, errors: [] });
    expect(await parseTex("\\documentclass{article}")).toBeNull();
    expect(scoreResume({ text: strong, parse: null })).toEqual(scoreResume({ text: strong }));
  });

  it("scores structured content from its fields and LaTeX from its text", () => {
    const content = resumeContentSchema.parse({
      basics: { name: "A", email: "a@example.com", links: [{ label: "LinkedIn", url: "https://linkedin.com/in/a" }] },
      sections: [
        {
          id: "x",
          type: "experience",
          title: "Where I've worked",
          entries: [
            { id: "e", organization: "Acme", role: "SWE", bullets: [{ id: "b", text: "Worked on the **API**" }] },
          ],
        },
      ],
    });
    const report = scoreResume({ content });
    const checks = Object.fromEntries(report.categories.flatMap((c) => c.checks).map((c) => [c.id, c]));
    expect(checks.linkedin!.status).toBe("pass");
    expect(checks.headings!.status).toBe("warn");
    expect(checks.dates!.status).toBe("warn");
    expect(checks.quantified!.fix).toContain('"Worked on the API"');

    const text = texToText(
      "\\documentclass{article}\\begin{document}\\section*{Experience}\\begin{itemize}\\item \\textbf{Cut} costs by 30\\% % note\n\\end{itemize}\\end{document}",
    );
    expect(text).toBe("Experience\n\n• Cut costs by 30%");
  });
});
