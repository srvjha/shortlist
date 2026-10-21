import { createHash } from "node:crypto";
import { z } from "zod";
import { generateStructured } from "../../lib/ai/generate.js";
import { redact } from "../../lib/ai/redact.js";
import type { ResumeContent } from "../../schemas/resume-content.js";
import type { atsReport } from "./ats.schemas.js";
import { findSkills } from "./skills/match.js";

type AtsReport = z.infer<typeof atsReport>;

// Nullable, never optional: see generateStructured.
export const aiMatchOutput = z.object({
  skills: z.array(z.object({ skill: z.string(), evidence: z.string().nullable() })),
  requirements: z.array(
    z.object({
      number: z.number().int(),
      status: z.enum(["met", "not-met", "unclear"]),
      evidence: z.string().nullable(),
    }),
  ),
});
type AiMatch = z.infer<typeof aiMatchOutput>;

const system = `You check a resume against a few requirements from a job description.
Use only what the resume text says. Never invent or assume skills, degrees, dates, places or experience that are not written in it.
Every evidence value must be copied exactly, character for character, from the resume text: a short phrase, one line at most.
Skills: a missing skill counts as implied only when the resume names something that clearly includes it, such as PostgreSQL for SQL or Next.js for React. Related or similar skills do not count. Otherwise give null evidence.
Requirements: answer met or not-met only when the resume text clearly shows it, with the line that shows it as evidence. Otherwise answer unclear with null evidence.`;

const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();

// Drops anything the model can't back with words that are really in the resume, or that it wasn't asked about.
export function grounded(ai: AiMatch, resumeText: string, asked: { skills: string[]; requirements: number }): AiMatch {
  const resume = normalize(resumeText);
  // A bare year or number like "2019" proves nothing on its own, so evidence needs a word.
  const found = (evidence: string | null): evidence is string =>
    Boolean(evidence && /\p{L}{2}/u.test(evidence) && resume.includes(normalize(evidence)));
  return {
    skills: ai.skills.flatMap((s) => {
      const skill = asked.skills.find((name) => normalize(name) === normalize(s.skill));
      // The evidence must name a skill we know of, so a vague line can't stand in for one.
      const names = found(s.evidence) ? findSkills(s.evidence).map((hit) => hit.skill) : [];
      return skill && names.some((name) => name !== skill) ? [{ skill, evidence: s.evidence! }] : [];
    }),
    requirements: ai.requirements.filter(
      (r) => r.status !== "unclear" && r.number >= 1 && r.number <= asked.requirements && found(r.evidence),
    ),
  };
}

// The score is never touched: implied skills stay missing, and only unclear requirements change.
export function mergeAiMatch(report: AtsReport, ai: AiMatch): AtsReport {
  if (!report.keywords || !report.knockouts) return report;
  const missing = report.keywords.hard.missing;
  const implied = missing.flatMap((skill) => {
    const hit = ai.skills.find((s) => s.skill === skill && s.evidence);
    return hit ? [{ skill, evidence: hit.evidence! }] : [];
  });
  let unclear = 0;
  const knockouts = report.knockouts.map((knockout) => {
    if (knockout.status !== "unclear") return knockout;
    const verdict = ai.requirements.find((r) => r.number === ++unclear);
    return verdict && verdict.status !== "unclear" && verdict.evidence
      ? { ...knockout, status: verdict.status, evidence: verdict.evidence, checkedWithAi: true }
      : knockout;
  });
  return { ...report, keywords: { ...report.keywords, implied }, knockouts };
}

// ponytail: one process's memory, lost on restart and not shared between API processes. Upgrade to a table keyed
// by the hash if repeat checks across processes start to cost real money.
const cache = new Map<string, AiMatch>();
const CACHE_SIZE = 500;

// Adds an AI reading of what the rules couldn't decide. Any failure (timeout, quota, no key, bad output) returns
// the rule-based report unchanged.
export async function withAiMatch(
  report: AtsReport,
  input: {
    userId: string;
    resumeText: string;
    jobText: string;
    content?: ResumeContent | null;
    resumeId?: string;
    jobId?: string;
  },
): Promise<AtsReport> {
  const skills = report.keywords?.hard.missing ?? [];
  const requirements = (report.knockouts ?? []).filter((k) => k.status === "unclear");
  if (skills.length === 0 && requirements.length === 0) return report;

  const key = createHash("sha256").update(`${input.resumeText}\0${input.jobText}`).digest("hex");
  try {
    let ai = cache.get(key);
    if (ai) cache.delete(key);
    else {
      const prompt = `Missing skills:
${skills.map((s) => `- ${s}`).join("\n") || "(none)"}

Unclear requirements:
${requirements.map((r, i) => `${i + 1}. ${r.label}: ${r.requirement}`).join("\n") || "(none)"}

<resume>
${input.resumeText.slice(0, 15_000)}
</resume>`;
      const redacted = redact(prompt, input.content ? [input.content] : []);
      const { data } = await generateStructured({
        userId: input.userId,
        step: "ats_match",
        tier: "fast",
        quota: "ats",
        schema: aiMatchOutput,
        system,
        prompt: redacted.text,
        timeoutMs: 8_000,
        ...(input.resumeId && { resumeId: input.resumeId }),
        ...(input.jobId && { jobId: input.jobId }),
      });
      ai = grounded(redacted.restore(data), input.resumeText, { skills, requirements: requirements.length });
    }
    cache.set(key, ai);
    if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!);
    return mergeAiMatch(report, ai);
  } catch {
    return report;
  }
}
