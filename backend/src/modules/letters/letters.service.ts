import { and, count, desc, eq, gte, isNull } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../../db/index.js";
import { aiRuns, letters, users } from "../../db/schema/index.js";
import { track, trackServer } from "../../lib/analytics.js";
import { AppError, NotFoundError } from "../../lib/errors.js";
import { visibleContent } from "../../templates/latex.js";
import { texToText } from "../ats/scoring.js";
import { getJob } from "../jobs/jobs.service.js";
import { getProfile } from "../profiles/profiles.service.js";
import { getResume } from "../resumes/resumes.service.js";
import { factText } from "../suggestions/operations.js";
import { assertAiQuota } from "../usage/quotas.js";
import { writeCoverLetter } from "./cover-letter.js";
import { renderLetter } from "./letter-tex.js";
import type { createLetterBody, createPublicCoverLetterBody, updateLetterBody } from "./letters.schemas.js";

// Across every visitor with no account, on top of the limit per IP, so rotating IPs can't run up the AI bill.
const PUBLIC_LETTERS_PER_DAY = 200;

async function coverLetterFor(userId: string, resumeId: string, jobId: string) {
  await assertAiQuota(userId, "letter");
  const resume = await getResume(userId, resumeId);
  if (!resume.head) throw new NotFoundError("Version");
  const job = await getJob(userId, jobId);
  const profile = (await getProfile(userId)).content;
  const content = resume.head.content && visibleContent(resume.head.content);
  const text = content ? JSON.stringify(content) : texToText(resume.head.texSource ?? "");
  const written = await writeCoverLetter({
    userId,
    resume: text,
    profile: JSON.stringify(profile),
    jobText: job.rawText,
    facts: [
      content ? factText(content) : text,
      factText(profile),
      ...[job.company, job.role].filter((fact): fact is string => Boolean(fact)),
    ],
    contents: content ? [content, profile] : [profile],
    signature: content?.basics.name || profile.basics.name,
    resumeId: resume.id,
    jobId: job.id,
  });
  const about = [written.role ?? job.role, written.company ?? job.company].filter(Boolean).join(" at ");
  return { title: about ? `Cover letter: ${about}` : "Cover letter", body: written.body, flags: written.flags };
}

export async function createLetter(userId: string, input: z.infer<typeof createLetterBody>) {
  const values =
    input.kind === "cover"
      ? { ...(await coverLetterFor(userId, input.resumeId, input.jobId)), resumeId: input.resumeId, jobId: input.jobId }
      : { title: input.title, body: input.body };
  const [letter] = await db
    .insert(letters)
    .values({ userId, kind: input.kind, ...values })
    .returning();
  track(userId, "letter_created", { kind: input.kind, flags: letter!.flags.length });
  return letter!;
}

export async function listLetters(userId: string) {
  return db
    .select({
      id: letters.id,
      kind: letters.kind,
      title: letters.title,
      resumeId: letters.resumeId,
      jobId: letters.jobId,
      createdAt: letters.createdAt,
      updatedAt: letters.updatedAt,
    })
    .from(letters)
    .where(eq(letters.userId, userId))
    .orderBy(desc(letters.updatedAt));
}

export async function getLetter(userId: string, letterId: string) {
  const [letter] = await db
    .select()
    .from(letters)
    .where(and(eq(letters.id, letterId), eq(letters.userId, userId)))
    .limit(1);
  if (!letter) throw new NotFoundError("Letter");
  return letter;
}

export async function updateLetter(userId: string, letterId: string, changes: z.infer<typeof updateLetterBody>) {
  const [letter] = await db
    .update(letters)
    .set({
      ...(changes.title !== undefined && { title: changes.title }),
      ...(changes.body !== undefined && { body: changes.body }),
      updatedAt: new Date(),
    })
    .where(and(eq(letters.id, letterId), eq(letters.userId, userId)))
    .returning();
  if (!letter) throw new NotFoundError("Letter");
  return letter;
}

export async function deleteLetter(userId: string, letterId: string) {
  const letter = await getLetter(userId, letterId);
  await db.delete(letters).where(eq(letters.id, letter.id));
}

// The look of the resume the letter was written from; without one (or if it's gone), the default look and the
// contact details from the profile.
export async function letterTex(userId: string, letter: typeof letters.$inferSelect) {
  const resume = letter.resumeId
    ? await getResume(userId, letter.resumeId).catch((error: unknown) => {
        if (error instanceof NotFoundError) return null;
        throw error;
      })
    : null;
  const content = resume?.head?.content;
  const basics = content?.basics ?? (await getProfile(userId)).content.basics;
  let name = basics.name;
  if (!name) {
    const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId));
    name = user?.name ?? "";
  }
  return {
    name,
    tex: renderLetter(letter.body, {
      templateId: content ? resume.templateId : null,
      layout: content ? resume.layout : undefined,
      // A resignation goes to the current employer, so it leaves out portfolio and social links.
      basics: { ...basics, name, links: letter.kind === "resignation" ? [] : basics.links },
    }),
  };
}

async function assertPublicBudget(now = new Date()) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const [row] = await db
    .select({ value: count() })
    .from(aiRuns)
    .where(and(isNull(aiRuns.userId), eq(aiRuns.step, "cover_letter"), gte(aiRuns.createdAt, today)));
  if ((row?.value ?? 0) >= PUBLIC_LETTERS_PER_DAY) {
    throw new AppError(
      503,
      "PUBLIC_LETTERS_BUSY",
      "The free generator has reached its limit for today. Sign in to keep going, or try again tomorrow.",
    );
  }
}

// Never stored, like the public ATS check: only the run's tokens and cost are logged. A signed-in user (not a guest)
// is counted on their own quota; anyone else shares the daily budget.
export async function writePublicCoverLetter(
  userId: string | null,
  input: z.infer<typeof createPublicCoverLetterBody>,
) {
  if (userId) await assertAiQuota(userId, "letter");
  else await assertPublicBudget();
  const { body, flags } = await writeCoverLetter({
    userId,
    resume: input.resumeText,
    jobText: input.jobDescription,
    facts: [input.resumeText],
  });
  trackServer("letter_created", { kind: "cover", source: "public", flags: flags.length });
  return { body, flags };
}
