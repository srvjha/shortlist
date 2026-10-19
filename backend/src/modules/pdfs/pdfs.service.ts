import type { Response } from "express";
import { AppError, NotFoundError } from "../../lib/errors.js";
import { compileTex } from "../../lib/latex/compile.js";
import type { ResumeContent } from "../../schemas/resume-content.js";
import { findTemplate } from "../../templates/index.js";
import type { ResumeLayout } from "../../templates/layout.js";
import { slugify } from "../users/usernames.js";

export function renderStructured(templateId: string | null, content: ResumeContent, layout?: ResumeLayout) {
  const template = findTemplate(templateId ?? "developer");
  if (!template) throw new NotFoundError("Template");
  return template.render(content, layout);
}

export function texForVersion(
  resume: { templateId: string | null; layout: ResumeLayout },
  version: { content: ResumeContent | null; texSource: string | null },
) {
  return version.content ? renderStructured(resume.templateId, version.content, resume.layout) : version.texSource!;
}

export async function compileOrThrow(tex: string, signal?: AbortSignal) {
  const result = await compileTex(tex, signal);
  if (!result.ok) {
    throw new AppError(422, "COMPILE_FAILED", "The resume could not be compiled", result.errors);
  }
  return result;
}

// A part already inside another is dropped, so the name and a title like "Aarav_Sharma_Resume" give
// aarav-sharma-resume.pdf, not aarav-sharma_aarav-sharma-resume.pdf. A title that says "resume" or "CV" is
// a file name the person chose, so it's used as it is; one like "Backend roles" still gets the name.
export function pdfFileName(person: string | undefined, title: string | undefined) {
  const parts = /\b(resume|cv)\b/i.test(title?.replace(/[_-]/g, " ") ?? "") ? [title] : [person, title];
  const slugs = [...new Set(parts.map((part) => slugify(part ?? "", 40)).filter(Boolean))];
  const name = slugs.filter((slug) => !slugs.some((other) => other !== slug && other.includes(slug))).join("_");
  return `${name || "resume"}.pdf`;
}

export function sendPdf(res: Response, pdf: Buffer, fileName: string, pageCount: number, download = false) {
  res
    .status(200)
    .set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${fileName}"`,
      "X-Page-Count": String(pageCount),
      "Access-Control-Expose-Headers": "X-Page-Count, Content-Disposition",
      "Cache-Control": "private, max-age=0, must-revalidate",
    })
    .send(pdf);
}
