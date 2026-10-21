import { beforeEach, describe, expect, it, vi } from "vitest";

const generateStructured = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/ai/generate.js", () => ({ generateStructured }));

import { grounded, mergeAiMatch, withAiMatch } from "../src/modules/ats/ai-match.js";
import { atsReport } from "../src/modules/ats/ats.schemas.js";
import { scoreResume } from "../src/modules/ats/scoring.js";

const resume = `Priya Nair
Backend Engineer
priya.nair@example.com | +91 98765 43210 | Pune, India

Experience
Software Engineer, Acme | Jul 2021 - Present
• Built billing APIs in Node.js backed by PostgreSQL, serving 3M requests a day
• Cut report build time from 40 minutes to 6 by moving jobs onto Kafka consumers
• Wrote a Next.js admin dashboard used by 40 support agents

Education
Bachelor of Engineering, Pune University, 2021

Skills
Node.js, PostgreSQL, Kafka, Next.js, Docker`;

const job = `Backend Engineer
Requirements:
- Strong SQL and React skills
- Experience with Kubernetes
- Degree in Computer Science or a related field`;

const asked = { skills: ["SQL", "React", "Kubernetes"], requirements: 1 };

beforeEach(() => {
  generateStructured.mockReset();
});

describe("grounded", () => {
  it("keeps only evidence that is really in the resume, ignoring case and spacing", () => {
    const ai = {
      skills: [
        { skill: "sql", evidence: "backed by   postgresql" },
        { skill: "React", evidence: "Built React apps" },
        { skill: "Kubernetes", evidence: null },
        { skill: "Terraform", evidence: "Docker" },
      ],
      requirements: [
        { number: 1, status: "met" as const, evidence: "Bachelor of Engineering, Pune University" },
        { number: 2, status: "met" as const, evidence: "Docker" },
      ],
    };
    expect(grounded(ai, resume, asked)).toEqual({
      skills: [{ skill: "SQL", evidence: "backed by   postgresql" }],
      requirements: [{ number: 1, status: "met", evidence: "Bachelor of Engineering, Pune University" }],
    });
  });

  it("drops still-unclear verdicts and invented requirement quotes", () => {
    const ai = {
      skills: [],
      requirements: [
        { number: 1, status: "unclear" as const, evidence: "Pune University" },
        { number: 1, status: "not-met" as const, evidence: "B.Tech in Mechanical Engineering" },
      ],
    };
    expect(grounded(ai, resume, asked).requirements).toEqual([]);
  });

  it("drops a bare year as proof, and a skill whose evidence names no skill", () => {
    const ai = {
      skills: [{ skill: "SQL", evidence: "Pune University" }],
      requirements: [{ number: 1, status: "met" as const, evidence: "2019" }],
    };
    expect(grounded(ai, `${resume} 2019`, asked)).toEqual({ skills: [], requirements: [] });
  });
});

describe("mergeAiMatch", () => {
  it("adds implied skills and AI verdicts without changing the score or the missing list", () => {
    const report = scoreResume({ text: resume, jobText: job });
    const unclear = report.knockouts!.filter((k) => k.status === "unclear");
    const merged = mergeAiMatch(report, {
      skills: [{ skill: report.keywords!.hard.missing[0]!, evidence: "PostgreSQL" }],
      requirements: unclear.length ? [{ number: 1, status: "met", evidence: "Bachelor of Engineering" }] : [],
    });
    expect(atsReport.parse(merged)).toEqual(merged);
    expect(merged.score).toBe(report.score);
    expect(merged.categories).toEqual(report.categories);
    expect(merged.keywords!.missing).toEqual(report.keywords!.missing);
    expect(merged.keywords!.implied).toEqual([{ skill: report.keywords!.hard.missing[0], evidence: "PostgreSQL" }]);
    const checked = merged.knockouts!.filter((k) => k.checkedWithAi);
    expect(checked).toHaveLength(unclear.length ? 1 : 0);
    for (const k of checked) expect(k).toMatchObject({ status: "met", evidence: "Bachelor of Engineering" });
  });
});

describe("withAiMatch", () => {
  const input = { userId: "user_1", resumeText: resume, jobText: job };

  it("returns the rule-based report unchanged when the model fails", async () => {
    const report = scoreResume({ text: resume, jobText: job });
    generateStructured.mockImplementation(async () => {
      throw new Error("timeout");
    });
    expect(await withAiMatch(report, input)).toBe(report);
    expect(generateStructured).toHaveBeenCalledTimes(1);
  });

  it("masks contact details, calls the model once per resume and job, and reuses the answer", async () => {
    const jobText = `${job}\nNice to have: GraphQL`;
    const report = scoreResume({ text: resume, jobText });
    const skill = report.keywords!.hard.missing[0]!;
    generateStructured.mockResolvedValue({
      data: { skills: [{ skill, evidence: "Next.js admin dashboard" }], requirements: [] },
      runId: "run_1",
    });
    const first = await withAiMatch(report, { ...input, jobText });
    const second = await withAiMatch(report, { ...input, jobText });
    expect(generateStructured).toHaveBeenCalledTimes(1);
    const call = generateStructured.mock.calls[0]![0];
    expect(call).toMatchObject({ tier: "fast", step: "ats_match", quota: "ats", timeoutMs: 8000 });
    expect(call.prompt).not.toContain("priya.nair@example.com");
    expect(call.prompt).not.toContain("98765 43210");
    expect(first.keywords!.implied).toEqual([{ skill, evidence: "Next.js admin dashboard" }]);
    expect(second).toEqual(first);
  });
});
