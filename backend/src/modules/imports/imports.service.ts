import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.js";
import { users } from "../../db/schema/index.js";
import { generateStructured } from "../../lib/ai/generate.js";
import { readUpload } from "../uploads/uploads.service.js";
import { assertAiQuota, assertResumeQuota } from "../usage/quotas.js";
import { applyBold, extractionSchema, normalizeExtraction, placeLinks } from "./extraction.js";
import { linkStyleOf, type pdfHints } from "./pdf-hints.js";
import { track } from "../../lib/analytics.js";
import { logger } from "../../lib/logger.js";
import type { ResumeContent } from "../../schemas/resume-content.js";
import type { extractTextItems } from "../ats/parser/extract.js";
import { parseItems } from "../ats/parser/parse.js";
import { restoreMissedLines } from "./coverage.js";
import { MAX_IMPORT_TEXT } from "./imports.schemas.js";
import { AppError } from "../../lib/errors.js";
import { inWorker } from "../../lib/in-worker.js";

// Resumes run 1 to 3 pages; anything longer is not a resume.
const MAX_IMPORT_PAGES = 4;

const system = `You extract resumes into structured JSON.
Rules:
- Copy facts exactly as written. Never invent, infer or embellish employers, dates, numbers or skills.
- Keep each bullet's wording, without its bullet symbol ("•", "-"). Wrap text that is bold in the source in
  **double asterisks**.
- Dates: "YYYY-MM" when the month is known, otherwise "YYYY"; use "present" for ongoing roles. Use null when unknown.
- Section types: summary (a summary, profile, objective or about paragraph, in "text"), experience (jobs,
  internships), education, projects, skills (grouped lists like "Languages: ..."), links (a bare list of profile
  links such as LeetCode or Codeforces), list (achievements, certifications, positions of responsibility,
  anything else).
- The headline is only a short title under the name. A paragraph about the person is a summary section.
- Publications, talks, awards and certifications are list sections, not projects.
- A single date (a graduation year, Class X or XII) is the end date; leave start null.
- Never split one item at a comma ("Winner, Smart India Hackathon" stays one title). Words that only name a link
  ("Verify", "Live", "Code", "PDF") are not content.
- In list sections, every item is its own entry. For an item written as "Name - description" (or with a colon or
  long dash), put the name in title and the description in subtitle; otherwise the whole item is the title.
- A project's "Tech Stack:" or "Technologies:" line goes in technologies, not in bullets.
- Link labels are short names like "LinkedIn", "GitHub" or "Portfolio", never the URL itself.
- Keep the source's section order and titles.
- Fill every field; use null or [] when something doesn't apply.`;

// A failed rule-based read never blocks an import; the AI's result is returned as it is.
async function checkCoverage(content: ResumeContent, pdf: Uint8Array | undefined) {
  if (!pdf) return { content, missed: [] };
  try {
    const { items, pageWidth, pageHeight } = await inWorker<Awaited<ReturnType<typeof extractTextItems>>>(
      import.meta.resolve("../ats/parser/extract.js"),
      "extractTextItems",
      pdf,
    );
    return restoreMissedLines(content, parseItems(items, { width: pageWidth, height: pageHeight }));
  } catch (err) {
    logger.warn({ err }, "Coverage check failed");
    return { content, missed: [] };
  }
}

const texLabel = "LaTeX source (ignore formatting commands, extract the content)";

export async function createImport(
  userId: string,
  input: { uploadId: string } | { text: string } | { texSource: string },
) {
  await assertAiQuota(userId, "import");
  let prompt = "Extract this resume.";
  const files: { data: Buffer; mediaType: string; filename: string }[] = [];
  let pdf: Uint8Array | undefined;
  let hidden: { text: string; url: string }[] = [];
  let boldPhrases: string[] = [];

  if ("uploadId" in input) {
    const { upload, body } = await readUpload(userId, input.uploadId);
    if (upload.kind === "pdf") {
      files.push({ data: body, mediaType: "application/pdf", filename: upload.fileName });
      pdf = new Uint8Array(body);
      const { links, bold, pages } = await inWorker<Awaited<ReturnType<typeof pdfHints>>>(
        import.meta.resolve("./pdf-hints.js"),
        "pdfHints",
        new Uint8Array(body),
      ).catch(() => {
        throw new AppError(422, "PDF_UNREADABLE", "This PDF couldn't be read. Export it again, or paste its text.");
      });
      // The whole PDF goes to the model, so a long document would cost far more than a resume.
      if (pages > MAX_IMPORT_PAGES)
        throw new AppError(
          400,
          "PDF_TOO_LONG",
          `Import works on resumes up to ${MAX_IMPORT_PAGES} pages. This PDF has ${pages}.`,
        );
      hidden = links;
      boldPhrases = bold;
      if (links.length) {
        prompt += `\n\nThese links are hidden behind text in the PDF. Each shows the words it sits on (or its line, for an icon), then where it points. Put a mailto: address in basics.email, a tel: number in basics.phone and profile links in basics.links. A link on an item's name or title goes in that item's url. A link on some words inside a bullet, summary, or list item's title or description stays on those words, written inline as [the words](url), with the rest of the text unchanged; each such link is kept, even when one item has several:\n${links.map((l) => `- "${l.text}" -> ${l.url}`).join("\n")}`;
      }
      if (bold.length) {
        prompt += `\n\nThese phrases are bold in the PDF. Wherever one appears inside a bullet, summary or list item, wrap it in **double asterisks**:\n${bold.map((b) => `- ${b}`).join("\n")}`;
      }
    } else {
      const label = upload.kind === "tex" ? texLabel : "text";
      const text = body.toString("utf8");
      if (text.length > MAX_IMPORT_TEXT)
        throw new AppError(
          400,
          "FILE_TOO_LONG",
          `Import works on files up to ${MAX_IMPORT_TEXT.toLocaleString("en-IN")} characters. This one is longer.`,
        );
      prompt = `Extract this resume from its ${label}:\n\n<resume>\n${text}\n</resume>`;
    }
  } else if ("texSource" in input) {
    prompt = `Extract this resume from its ${texLabel}:\n\n<resume>\n${input.texSource}\n</resume>`;
  } else {
    prompt = `Extract this resume:\n\n<resume>\n${input.text}\n</resume>`;
  }

  const { data, runId } = await generateStructured({
    userId,
    step: "import",
    quota: "import",
    tier: "fast",
    schema: extractionSchema,
    system,
    prompt,
    files,
  });
  const extracted = applyBold(placeLinks(normalizeExtraction(data), hidden), boldPhrases);
  // The model sometimes skips an email or phone that sits only behind an icon.
  const behind = (scheme: string) => {
    const link = hidden.find((l) => l.url.toLowerCase().startsWith(scheme));
    try {
      return link && decodeURIComponent(link.url.slice(scheme.length).split("?")[0]!).trim();
    } catch {
      return undefined;
    }
  };
  const email = behind("mailto:");
  if (!extracted.basics.email && z.email().safeParse(email).success) extracted.basics.email = email;
  extracted.basics.phone ||= behind("tel:")?.slice(0, 30) || undefined;
  const { content, missed } = await checkCoverage(extracted, pdf);
  track(userId, "resume_imported", { from: "uploadId" in input ? "file" : "text", missed_lines: missed.length });
  const linkStyle = linkStyleOf(
    hidden,
    content.basics.links.map((link) => link.url),
  );
  return { content, aiRunId: runId, missed, ...(linkStyle && { linkStyle }) };
}

const draftSystem = `You write a resume from a person's own rough notes, as structured JSON.
Rules:
- Use only facts from the notes: employers, schools, dates, numbers, tools and results. Never invent any of them, and
  never add a number, metric or skill that isn't in the notes.
- Turn each rough note into a concise resume bullet: start with a strong past-tense verb, say what was built or done and
  its result, ideally in one line. Wrap the one key technology or result of a bullet in **double asterisks**.
- The headline is a short title for the target role, like "Backend Engineer".
- Add a summary section of two sentences only when the notes give enough to say something specific about the person.
- Group skills by kind (Languages, Frameworks, Tools and so on), using only tools the notes mention.
- Education goes in its fields (institution, degree, field, score, dates), with no bullets unless the notes add
  something more, like coursework or a thesis.
- Project and job details go in bullets; leave subtitle and title null for them.
- In list sections, every achievement or certification is its own entry with its text as the title and no bullets.
- Put education first for students and freshers, experience first for everyone else.
- Dates: "YYYY-MM" when the month is known, otherwise "YYYY"; "present" for ongoing roles; null when not given.
- Section types: summary (in "text"), experience, education, projects, skills, links, list (achievements,
  certifications, positions of responsibility).
- Fill every field; use null or [] when something doesn't apply.`;

// Writes a first resume from notes for someone starting from nothing. Same output and cleanup as an import.
export async function createDraft(userId: string, input: { role: string; notes: string }) {
  // A draft only ever becomes a new resume, so don't spend the AI call when that would be refused.
  await assertResumeQuota(userId);
  await assertAiQuota(userId, "draft");
  const { data, runId } = await generateStructured({
    userId,
    step: "draft",
    quota: "draft",
    tier: "smart",
    schema: extractionSchema,
    system: draftSystem,
    prompt: `Target role: ${input.role}\n\nNotes:\n<notes>\n${input.notes}\n</notes>`,
  });
  track(userId, "resume_drafted", {});
  // Notes rarely include a name or email; the account has them, added here so they never reach the model.
  const content = normalizeExtraction(data);
  const [user] = await db
    .select({ name: users.name, email: users.email, isAnonymous: users.isAnonymous })
    .from(users)
    .where(eq(users.id, userId));
  if (user && !user.isAnonymous) {
    content.basics.name ||= user.name;
    content.basics.email ??= user.email;
  }
  return { content, aiRunId: runId };
}
