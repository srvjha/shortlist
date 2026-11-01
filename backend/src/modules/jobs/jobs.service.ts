import { createHash } from "node:crypto";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import { jobs } from "../../db/schema/index.js";
import { generateStructured } from "../../lib/ai/generate.js";
import { AppError, NotFoundError } from "../../lib/errors.js";
import { parsedJobSchema } from "./jobs.schemas.js";
import { track } from "../../lib/analytics.js";
import { readWebPage } from "../../lib/web-page.js";

const system = `You extract structured requirements from job descriptions.
Copy requirements faithfully; don't add skills that aren't mentioned. Keep items short (1-5 words each).
Use null when the company or role isn't stated.`;

function hashText(text: string) {
  return createHash("sha256").update(text.toLowerCase().replace(/\s+/g, " ").trim()).digest("hex");
}

async function fetchJobText(url: string) {
  const text = await readWebPage(url);
  if (text.length < 200) {
    throw new AppError(
      422,
      "JOB_URL_UNREADABLE",
      "Couldn't read that job page. Paste the job description text instead.",
    );
  }
  return text;
}

export async function createJob(userId: string, input: { rawText: string } | { sourceUrl: string }) {
  const sourceUrl = "sourceUrl" in input ? input.sourceUrl : null;
  const rawText = "rawText" in input ? input.rawText : await fetchJobText(input.sourceUrl);
  const textHash = hashText(rawText);

  // The same posting is often pasted by many users; reuse an earlier parse instead of calling the model again.
  const [previous] = await db
    .select({ parsed: jobs.parsed })
    .from(jobs)
    .where(and(eq(jobs.textHash, textHash), isNotNull(jobs.parsed)))
    .limit(1);

  const parsed = previous
    ? parsedJobSchema.parse(previous.parsed)
    : (
        await generateStructured({
          userId,
          step: "jd_parse",
          tier: "fast",
          quota: "job",
          schema: parsedJobSchema,
          system,
          prompt: `Extract the requirements from this job description:\n\n<job>\n${rawText}\n</job>`,
        })
      ).data;

  const [job] = await db
    .insert(jobs)
    .values({ userId, company: parsed.company, role: parsed.role, sourceUrl, rawText, textHash, parsed })
    .returning();
  track(userId, "job_added", { from: sourceUrl ? "link" : "text" });
  return { ...job!, parsed };
}

export async function listJobs(userId: string) {
  return db
    .select({
      id: jobs.id,
      company: jobs.company,
      role: jobs.role,
      sourceUrl: jobs.sourceUrl,
      createdAt: jobs.createdAt,
    })
    .from(jobs)
    .where(eq(jobs.userId, userId))
    .orderBy(desc(jobs.createdAt));
}

export async function getJob(userId: string, jobId: string) {
  const [job] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)))
    .limit(1);
  if (!job) throw new NotFoundError("Job");
  return { ...job, parsed: job.parsed ? parsedJobSchema.parse(job.parsed) : null };
}

export async function deleteJob(userId: string, jobId: string) {
  const job = await getJob(userId, jobId);
  await db.delete(jobs).where(eq(jobs.id, job.id));
}
