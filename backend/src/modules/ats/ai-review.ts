import type { z } from "zod";
import { generateStructured } from "../../lib/ai/generate.js";
import { redact } from "../../lib/ai/redact.js";
import { assertPaidPlan } from "../usage/quotas.js";
import { aiReviewOutput } from "./ats.schemas.js";

type AiReview = z.infer<typeof aiReviewOutput>;

const system = `You are an experienced recruiter reviewing a resume for any field: software, data, finance, banking, consulting, marketing, design or others.
Use only what the resume text says. Never invent or assume skills, employers, degrees, dates, numbers or results that are not written in it.
verdict: two or three plain sentences on how the resume reads in a recruiter's first 30 seconds.
strengths: up to three things the resume already does well, each one sentence.
fixes: the three to five changes that would improve it most, most important first. title is a short instruction, why is one sentence.
line is the resume line the fix is about, copied exactly, character for character, or null when the fix is about the whole resume.
rewrite is a stronger version of that line, or null: lead with an action verb and make the result clear. A rewrite keeps every fact of the line and never adds a task, tool, skill or activity the line doesn't state; what the resume lacks belongs in the fix's why or in jobFit gaps. Where a number would help but the line has none, write a placeholder in square brackets, like [X%] or [number of users], for the person to fill in. Placeholders are only for numbers.
jobFit: only when a job description is given, otherwise null. summary is two sentences on how well the resume fits the role; gaps lists up to five things the job asks for that the resume doesn't show.
Write in simple English. No hype, and never promise interviews or offers.`;

const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();
// Numbers outside placeholders, so a rewrite can't bring in a figure the line never had.
// A bullet marker the model copied with the line.
const unbullet = (text: string) => text.replace(/^[\s•◦▪*·–-]+/u, "");
const numbers = (text: string) => text.replace(/\[[^\]]*\]/g, "").match(/\d+(?:[.,]\d+)*/g) ?? [];

// A fix's line must be a real resume line, not a lone heading, and its rewrite must change it using only the
// numbers the line already has.
export function groundedReview(review: AiReview, resumeText: string): AiReview {
  const resume = normalize(resumeText);
  return {
    verdict: review.verdict,
    strengths: review.strengths.slice(0, 3),
    fixes: review.fixes.slice(0, 5).map((fix) => {
      const line =
        fix.line && fix.line.trim().split(/\s+/).length >= 3 && resume.includes(normalize(fix.line)) ? fix.line : null;
      const lineNumbers = new Set(numbers(line ?? ""));
      const rewrite =
        line &&
        fix.rewrite &&
        normalize(fix.rewrite) !== normalize(line) &&
        numbers(fix.rewrite).every((n) => lineNumbers.has(n))
          ? fix.rewrite
          : null;
      return { ...fix, line: line && unbullet(line), rewrite: rewrite && unbullet(rewrite) };
    }),
    jobFit: review.jobFit && { summary: review.jobFit.summary, gaps: review.jobFit.gaps.slice(0, 5) },
  };
}

// Season Pass and Pro only. Counts against the plan's monthly review limit unless the user's own key is used.
export async function reviewResume(input: { userId: string; text: string; jobDescription?: string | undefined }) {
  await assertPaidPlan(input.userId, "The AI review");
  const prompt = `<resume>
${input.text.slice(0, 15_000)}
</resume>${input.jobDescription ? `\n\n<job>\n${input.jobDescription.slice(0, 8_000)}\n</job>` : ""}`;
  const redacted = redact(prompt, []);
  const { data } = await generateStructured({
    userId: input.userId,
    step: "ats_review",
    tier: "fast",
    quota: "review",
    schema: aiReviewOutput,
    system,
    prompt: redacted.text,
    timeoutMs: 45_000,
  });
  return groundedReview(redacted.restore(data), input.text);
}
