import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../../db/index.js";
import { aiRuns } from "../../db/schema/index.js";
import { generateStructured } from "../../lib/ai/generate.js";
import { redact } from "../../lib/ai/redact.js";
import { knownCostUsdMicros } from "../../lib/ai/pricing.js";
import { ConflictError, NotFoundError } from "../../lib/errors.js";
import { shortId } from "../../lib/ids.js";
import { compileTex } from "../../lib/latex/compile.js";
import type { ResumeContent } from "../../schemas/resume-content.js";
import { getJob } from "../jobs/jobs.service.js";
import { getProfile } from "../profiles/profiles.service.js";
import { appendVersion, getOwnedResume, getResume } from "../resumes/resumes.service.js";
import { assertAiQuota } from "../usage/quotas.js";
import {
  applyOperations,
  factText,
  isApplicable,
  type Operation,
  operationSchema,
  unverifiedTerms,
} from "./operations.js";
import {
  aiCodeOutput,
  aiStructuredOutput,
  type createSuggestionBody,
  type suggestionFeedbackBody,
  storedSuggestion,
} from "./suggestions.schemas.js";
import { track } from "../../lib/analytics.js";

type CreateInput = z.infer<typeof createSuggestionBody>;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const rules = `Rules you must follow:
- Never invent facts. Don't add employers, titles, dates, numbers, metrics, tools or skills that don't appear in
  the resume or the master profile. You may rephrase, reorder, emphasise with **bold**, or hide content.
- Keep bullets to one or two lines (under 200 characters), starting with a strong action verb, no first person.
- To split a long bullet or give an item more bullets, rewrite the existing bullet with update_bullet and put the
  rest in add_bullet after it. New bullets follow the same rule: only facts already in the resume or profile.
  A rewritten bullet is never longer than the one it replaces, unless that one was under 120 characters.
- For a request about spacing ("less space between these", "tighten the gaps"), use set_space_after on each
  section or entry above a gap, never a text edit. spaceAfter in the JSON is the current value; lower it to
  tighten (down to -8) or raise it to loosen. To even out a list, set every entry but the last.
- Text like [the words](https://address) is a link on those words. Keep every link and its address exactly as
  written when you rephrase; never add, change or remove one.
- Refer to items only by the ids given in the JSON. Propose only changes that clearly help.
- Follow the conventions (spelling, date format, terminology) of the job's location when a job is given,
  otherwise keep the resume's own.
- Text like [email 1] or [company 2] is a private placeholder. Copy it exactly; never guess what it stands for.`;

const quotaFor = (type: CreateInput["type"]) =>
  type === "tailor" ? "tailor" : type === "fix_compile" ? "fix" : "edit";

function toOperation(raw: z.infer<typeof aiStructuredOutput>["operations"][number]) {
  const candidate =
    raw.type === "update_bullet"
      ? { type: raw.type, bulletId: raw.targetId, text: raw.text }
      : raw.type === "add_bullet"
        ? { type: raw.type, afterBulletId: raw.targetId, text: raw.text }
        : raw.type === "update_headline"
          ? { type: raw.type, text: raw.text }
          : raw.type === "set_hidden"
            ? { type: raw.type, targetId: raw.targetId, hidden: raw.hidden }
            : raw.type === "set_space_after"
              ? { type: raw.type, targetId: raw.targetId, points: raw.points }
              : raw.type === "reorder"
                ? { type: raw.type, parentId: raw.targetId, orderedIds: raw.orderedIds }
                : { type: raw.type, groupId: raw.targetId, items: raw.items };
  const parsed = operationSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function flagsFor(op: z.infer<typeof operationSchema>, facts: string[]) {
  const check = (text: string) => unverifiedTerms(text, facts).map((term) => `Not found in your profile: ${term}`);
  if (op.type === "update_bullet" || op.type === "add_bullet" || op.type === "update_headline") return check(op.text);
  if (op.type === "update_skills") return check(op.items.join(", "));
  return [];
}

function toResponse(run: typeof aiRuns.$inferSelect) {
  const stored = storedSuggestion.parse(run.patchOps);
  return {
    id: run.id,
    type: stored.type,
    status: run.versionId ? ("applied" as const) : ("pending" as const),
    baseVersionId: stored.baseVersionId,
    appliedVersionId: run.versionId,
    summary: stored.summary,
    operations: stored.operations as Operation[],
    model: run.model,
    byok: run.byok,
    costUsdMicros: knownCostUsdMicros(run),
    createdAt: run.createdAt,
  };
}

async function structuredSuggestion(
  userId: string,
  resumeId: string,
  input: CreateInput,
  content: ResumeContent,
  pageLimit: number,
) {
  const profile = (await getProfile(userId)).content;
  let prompt: string;
  let jobId: string | undefined;

  if (input.type === "tailor") {
    const job = await getJob(userId, input.jobId);
    jobId = job.id;
    prompt = `Tailor this resume for the job below. Emphasise what matches the job's requirements, reorder so the
most relevant items come first, rephrase bullets to surface matching skills (only where truthful), and hide
weaker items if needed to fit ${pageLimit} page(s).
${input.instructions ? `\nThe user adds: ${input.instructions}\n` : ""}
<job_requirements>${JSON.stringify(job.parsed)}</job_requirements>
<job_description>${job.rawText.slice(0, 12_000)}</job_description>
<resume>${JSON.stringify(content)}</resume>
<master_profile>${JSON.stringify(profile)}</master_profile>`;
  } else {
    const scope =
      input.type === "edit" && input.targetIds?.length ? `\nOnly change these ids: ${input.targetIds.join(", ")}` : "";
    prompt = `Apply this request to the resume: ${input.type === "edit" ? input.instruction : ""}${scope}
<resume>${JSON.stringify(content)}</resume>
<master_profile>${JSON.stringify(profile)}</master_profile>`;
  }

  const isInline = input.type === "edit" && Boolean(input.targetIds?.length);
  const redacted = redact(prompt, [content, profile]);
  const { data: masked, runId } = await generateStructured({
    userId,
    step: input.type === "tailor" ? "rewrite" : isInline ? "inline_edit" : "chat_edit",
    tier: isInline ? "fast" : "smart",
    quota: quotaFor(input.type),
    schema: aiStructuredOutput,
    system: `You are an expert resume editor for every field, from software and data to finance, consulting, marketing and design. Use the vocabulary recruiters in the person's field expect.\n${rules}`,
    prompt: redacted.text,
    resumeId,
    ...(jobId && { jobId }),
  });
  const data = redacted.restore(masked);

  const facts = [factText(content), factText(profile)];
  const operations: Operation[] = data.operations.flatMap((raw) => {
    const op = toOperation(raw);
    if (!op || !isApplicable(content, op)) return [];
    return [{ ...op, id: shortId(), reason: raw.reason, flags: flagsFor(op, facts) }];
  });
  return { runId, summary: data.summary, operations };
}

async function codeSuggestion(userId: string, resumeId: string, input: CreateInput, texSource: string) {
  const profile = (await getProfile(userId)).content;
  let prompt: string;
  let jobId: string | undefined;

  if (input.type === "fix_compile") {
    const result = await compileTex(texSource);
    if (result.ok) throw new ConflictError("This resume already compiles");
    prompt = `Fix the LaTeX so it compiles with XeTeX. Change as little as possible and keep the content identical.
<errors>${JSON.stringify(result.errors)}</errors>
<latex>${texSource}</latex>`;
  } else if (input.type === "tailor") {
    const job = await getJob(userId, input.jobId);
    jobId = job.id;
    prompt = `Tailor this LaTeX resume for the job. Keep the document's structure, macros and packages; change only content.
${input.instructions ? `The user adds: ${input.instructions}\n` : ""}
<job_requirements>${JSON.stringify(job.parsed)}</job_requirements>
<master_profile>${JSON.stringify(profile)}</master_profile>
<latex>${texSource}</latex>`;
  } else {
    prompt = `Apply this request to the LaTeX resume, keeping its structure and macros: ${input.instruction}
<latex>${texSource}</latex>`;
  }

  // Code-mode resumes have no structured content, so the profile's sensitive values are masked in the source.
  const redacted = redact(prompt, [profile]);
  const { data: masked, runId } = await generateStructured({
    userId,
    step: input.type === "fix_compile" ? "fix_compile" : input.type === "tailor" ? "rewrite" : "chat_edit",
    tier: "smart",
    quota: quotaFor(input.type),
    schema: aiCodeOutput,
    system: `You edit LaTeX resumes. Return the complete document.\n${rules}`,
    prompt: redacted.text,
    resumeId,
    ...(jobId && { jobId }),
  });
  const data = redacted.restore(masked);

  // Every LaTeX suggestion is compiled before the user sees it.
  const compiled = await compileTex(data.texSource);
  const flags = compiled.ok
    ? []
    : compiled.errors.map((e) => `Does not compile${e.line ? ` (line ${e.line})` : ""}: ${e.message}`);
  const operations: Operation[] = [
    { type: "replace_source", texSource: data.texSource, id: shortId(), reason: data.reason, flags },
  ];
  return { runId, summary: data.summary, operations };
}

export async function createSuggestion(userId: string, resumeId: string, input: CreateInput) {
  const resume = await getResume(userId, resumeId);
  const head = resume.head;
  if (!head) throw new NotFoundError("Version");

  if (input.type === "fix_compile" && resume.mode !== "code") {
    throw new ConflictError("Only code-mode resumes can have compile fixes");
  }
  await assertAiQuota(userId, quotaFor(input.type));

  const result =
    resume.mode === "code"
      ? await codeSuggestion(userId, resume.id, input, head.texSource!)
      : await structuredSuggestion(userId, resume.id, input, head.content!, resume.pageLimit);

  const [run] = await db
    .update(aiRuns)
    .set({
      patchOps: { type: input.type, baseVersionId: head.id, summary: result.summary, operations: result.operations },
    })
    .where(eq(aiRuns.id, result.runId))
    .returning();
  track(userId, "ai_suggestion_created", { type: input.type });
  return toResponse(run!);
}

async function getOwnedSuggestionRun(
  userId: string,
  resumeId: string,
  suggestionId: string,
  executor: Tx | typeof db = db,
  lock = false,
) {
  const query = executor
    .select()
    .from(aiRuns)
    .where(
      and(
        eq(aiRuns.id, suggestionId),
        eq(aiRuns.userId, userId),
        eq(aiRuns.resumeId, resumeId),
        isNotNull(aiRuns.patchOps),
      ),
    )
    .limit(1);
  // Row lock: a concurrent apply waits here until this transaction commits, then sees versionId set.
  const [run] = lock ? await query.for("update") : await query;
  if (!run) throw new NotFoundError("Suggestion");
  return run;
}

export async function getSuggestion(userId: string, resumeId: string, suggestionId: string) {
  await getOwnedResume(userId, resumeId);
  return toResponse(await getOwnedSuggestionRun(userId, resumeId, suggestionId));
}

export async function listSuggestions(userId: string, resumeId: string) {
  await getOwnedResume(userId, resumeId);
  const runs = await db
    .select()
    .from(aiRuns)
    .where(and(eq(aiRuns.userId, userId), eq(aiRuns.resumeId, resumeId), isNotNull(aiRuns.patchOps)))
    .orderBy(desc(aiRuns.createdAt))
    .limit(50);
  return runs.map((run) => {
    const { operations: _operations, ...rest } = toResponse(run);
    return rest;
  });
}

// Saving again replaces the earlier answer, so a user can add a comment after rating.
export async function saveFeedback(
  userId: string,
  resumeId: string,
  suggestionId: string,
  input: z.output<typeof suggestionFeedbackBody>,
) {
  const run = await getOwnedSuggestionRun(userId, resumeId, suggestionId);
  await db
    .update(aiRuns)
    .set({
      helpful: input.helpful,
      feedback: input.comment || null,
      feedbackContactOk: input.contactOk,
      feedbackAt: new Date(),
    })
    .where(eq(aiRuns.id, run.id));
  track(userId, "ai_feedback", { helpful: input.helpful, step: run.step });
}

// Creates a new version from the accepted operations. Applied on top of the current head,
// so edits the user made after asking for the suggestion are kept.
export async function applySuggestion(userId: string, resumeId: string, suggestionId: string, acceptedIds: string[]) {
  const version = await db.transaction(async (tx) => {
    // Locks the resume like a save does, so an autosave can't move the head while this applies.
    const resume = await getOwnedResume(userId, resumeId, tx, true);
    const run = await getOwnedSuggestionRun(userId, resumeId, suggestionId, tx, true);
    if (run.versionId) throw new ConflictError("This suggestion was already applied");

    const suggestion = toResponse(run);
    const accepted = suggestion.operations.filter((op) => acceptedIds.includes(op.id));
    if (accepted.length === 0) throw new ConflictError("None of the accepted operations belong to this suggestion");

    const current = await getResume(userId, resume.id, tx);
    let version;
    if (resume.mode === "code") {
      const replacement = accepted.find((op) => op.type === "replace_source");
      if (!replacement || replacement.type !== "replace_source") throw new ConflictError("Nothing to apply");
      version = await appendVersion(
        tx,
        resume,
        "ai",
        { texSource: replacement.texSource },
        { label: suggestion.summary.slice(0, 80) },
      );
    } else {
      const applicable = accepted.filter((op) => isApplicable(current.head!.content!, op));
      if (applicable.length === 0) throw new ConflictError("The resume changed and these operations no longer apply");
      const content = applyOperations(current.head!.content!, applicable);
      version = await appendVersion(tx, resume, "ai", { content }, { label: suggestion.summary.slice(0, 80) });
    }

    await tx
      .update(aiRuns)
      .set({ versionId: version.id, acceptedOpIds: accepted.map((op) => op.id) })
      .where(eq(aiRuns.id, run.id));
    return version;
  });
  track(userId, "ai_suggestion_applied", { accepted: acceptedIds.length });
  return version;
}
