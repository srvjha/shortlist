import { Router } from "express";
import { ConflictError, NotFoundError } from "../../lib/errors.js";
import { oneAtATime } from "../../lib/latex/compile.js";
import { currentUser, requireAuth } from "../../middleware/require-auth.js";
import { compileLimiter } from "../../middleware/rate-limit.js";
import { validated } from "../../middleware/validate.js";
import { resumeParams } from "../resumes/resumes.schemas.js";
import { getResume, getVersion } from "../resumes/resumes.service.js";
import { recordPdfDownload } from "../usage/quotas.js";
import { toJsonResume } from "./json-resume.js";
import { createPreviewBody, resumeExportQuery, resumePdfQuery } from "./pdfs.schemas.js";
import { compileOrThrow, pdfFileName, renderStructured, sendPdf, texForVersion } from "./pdfs.service.js";

export const pdfsRouter = Router();

pdfsRouter.get(
  "/resumes/:resumeId/pdf",
  requireAuth,
  compileLimiter,
  ...validated({ params: resumeParams, query: resumePdfQuery }, async (req, res) => {
    const userId = currentUser(req).id;
    const resume = await getResume(userId, req.params.resumeId);
    const version = req.query.versionId ? await getVersion(userId, resume.id, req.query.versionId) : resume.head;
    if (!version) throw new NotFoundError("Version");

    const { pdf, pageCount } = await oneAtATime(userId, () => compileOrThrow(texForVersion(resume, version)));
    // Counted only once the PDF exists, so a failed compile never uses up a download.
    if (req.query.download) await recordPdfDownload(userId, version.id);
    sendPdf(res, pdf, pdfFileName(version.content?.basics.name, resume.title), pageCount, req.query.download);
  }),
);

// LaTeX source of a version, e.g. to continue editing on Overleaf.
pdfsRouter.get(
  "/resumes/:resumeId/tex",
  requireAuth,
  ...validated({ params: resumeParams, query: resumeExportQuery }, async (req, res) => {
    const userId = currentUser(req).id;
    const resume = await getResume(userId, req.params.resumeId);
    const version = req.query.versionId ? await getVersion(userId, resume.id, req.query.versionId) : resume.head;
    if (!version) throw new NotFoundError("Version");
    const fileName = pdfFileName(version.content?.basics.name, resume.title).replace(/\.pdf$/, ".tex");
    res
      .type("application/x-tex")
      .set("Content-Disposition", `attachment; filename="${fileName}"`)
      .send(texForVersion(resume, version));
  }),
);

// Structured content in the JSON Resume format.
pdfsRouter.get(
  "/resumes/:resumeId/json-resume",
  requireAuth,
  ...validated({ params: resumeParams, query: resumeExportQuery }, async (req, res) => {
    const userId = currentUser(req).id;
    const resume = await getResume(userId, req.params.resumeId);
    const version = req.query.versionId ? await getVersion(userId, resume.id, req.query.versionId) : resume.head;
    if (!version?.content) throw new ConflictError("JSON Resume export is only available for structured resumes");
    const fileName = pdfFileName(version.content.basics.name, resume.title).replace(/\.pdf$/, ".json");
    res.set("Content-Disposition", `attachment; filename="${fileName}"`).json(toJsonResume(version.content));
  }),
);

// Compiles unsaved editor state for the live preview.
pdfsRouter.post(
  "/previews",
  requireAuth,
  compileLimiter,
  ...validated({ body: createPreviewBody }, async (req, res) => {
    const userId = currentUser(req).id;
    const tex =
      "content" in req.body
        ? renderStructured(req.body.templateId, req.body.content, req.body.layout)
        : req.body.texSource;
    // The editor cancels a preview when a newer edit comes in; stop compiling it too.
    const abandoned = new AbortController();
    res.on("close", () => {
      if (!res.writableEnded) abandoned.abort();
    });
    try {
      const { pdf, pageCount } = await oneAtATime(userId, () => compileOrThrow(tex, abandoned.signal));
      sendPdf(res, pdf, "preview.pdf", pageCount);
    } catch (err) {
      // Nobody is listening any more; not a server error.
      if (abandoned.signal.aborted) return;
      throw err;
    }
  }),
);
