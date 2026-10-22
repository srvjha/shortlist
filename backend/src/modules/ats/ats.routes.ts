import { Router } from "express";
import { track, trackServer } from "../../lib/analytics.js";
import { NotFoundError } from "../../lib/errors.js";
import { sendData } from "../../lib/http.js";
import { oneAtATime } from "../../lib/latex/compile.js";
import { aiLimiter, atsLimiter, compileLimiter } from "../../middleware/rate-limit.js";
import { currentUser, requireAuth } from "../../middleware/require-auth.js";
import { validated } from "../../middleware/validate.js";
import type { ResumeContent } from "../../schemas/resume-content.js";
import { visibleContent } from "../../templates/latex.js";
import { getJob } from "../jobs/jobs.service.js";
import { texForVersion } from "../pdfs/pdfs.service.js";
import { resumeParams } from "../resumes/resumes.schemas.js";
import { getResume } from "../resumes/resumes.service.js";
import { withAiMatch } from "./ai-match.js";
import { reviewResume } from "./ai-review.js";
import {
  atsReport,
  atsReview,
  createAtsReportBody,
  createAtsReviewBody,
  createResumeAtsReportBody,
} from "./ats.schemas.js";
import type { Expected } from "./parser/quality.js";
import { parsePdfItems, parseTex, resumeText, scoreResume, texToText } from "./scoring.js";

export const atsRouter = Router();

const PARSED_KINDS = new Set(["experience", "education", "skills", "projects"]);

// What the parser should read back from a structured resume: only what the template prints.
function expectedFields(content: ResumeContent): Expected {
  const { basics, sections } = visibleContent(content);
  const shown = sections.filter(
    (s) =>
      (s.type === "skills"
        ? s.groups
        : s.type === "links"
          ? s.links
          : s.type === "summary"
            ? [s.text].filter(Boolean)
            : s.entries
      ).length,
  );
  return {
    name: basics.name || undefined,
    email: basics.email,
    phone: basics.phone,
    sectionKinds: [...new Set(shown.map((s) => s.type).filter((type) => PARSED_KINDS.has(type)))],
    jobs: shown.flatMap((s) =>
      s.type === "experience" ? s.entries.map((e) => ({ title: e.role, company: e.organization })) : [],
    ),
  };
}

// LaTeX source has no fields, so only the email and phone found in its text are checked.
function expectedFromText(text: string): Expected | undefined {
  const email = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/.exec(text)?.[0];
  const phone = /\+?\d[\d ().-]{8,16}\d/.exec(text.replace(/[\w.+-]+@\S+/g, " "))?.[0];
  return email || phone ? { email, phone } : undefined;
}

atsRouter.post(
  "/resumes/:resumeId/ats-reports",
  requireAuth,
  compileLimiter,
  ...validated({ params: resumeParams, body: createResumeAtsReportBody }, async (req, res) => {
    const user = currentUser(req);
    const userId = user.id;
    const resume = await getResume(userId, req.params.resumeId);
    const { head } = resume;
    if (!head) throw new NotFoundError("Version");
    const job = req.body.jobId ? await getJob(userId, req.body.jobId) : null;
    const text = head.texSource && texToText(head.texSource);
    const scored = scoreResume({
      content: head.content,
      text,
      jobText: job?.rawText,
      parse: await oneAtATime(userId, () =>
        parseTex(
          texForVersion(resume, head),
          head.content ? expectedFields(head.content) : expectedFromText(text ?? ""),
        ),
      ),
    });
    // Guest accounts are free to make, so like the public checker they don't get the AI check on our key.
    const report =
      job && !("isAnonymous" in user && user.isAnonymous === true)
        ? await withAiMatch(scored, {
            userId,
            resumeText: resumeText({ content: head.content, text }),
            jobText: job.rawText,
            content: head.content,
            resumeId: resume.id,
            jobId: job.id,
          })
        : scored;
    track(userId, "ats_report_created", { source: "resume", score: report.score, withJob: Boolean(job) });
    sendData(res, atsReport, report);
  }),
);

// Public: the text is scored in memory and never stored or logged. With a job description, a signed-in user
// (not a guest) also gets the AI check, on their own quota; anyone else gets the rule-based report.
atsRouter.post(
  "/ats-reports",
  atsLimiter,
  ...validated({ body: createAtsReportBody }, async (req, res) => {
    const { text, jobDescription, items, page, file } = req.body;
    const scored = scoreResume({
      text,
      jobText: jobDescription,
      parse: items && page ? parsePdfItems(items, page) : null,
      pdf: items && page ? { items, page } : null,
      file: file ?? null,
    });
    const user = req.user;
    const report =
      jobDescription && user && !("isAnonymous" in user && user.isAnonymous === true)
        ? await withAiMatch(scored, { userId: user.id, resumeText: resumeText({ text }), jobText: jobDescription })
        : scored;
    trackServer("ats_report_created", {
      source: "public",
      score: report.score,
      words: report.stats.words,
      bullets: report.stats.bullets,
      withJob: Boolean(jobDescription),
    });
    sendData(res, atsReport, report);
  }),
);

// Season Pass and Pro: an AI reviewer's verdict and top fixes, asked for after the rule-based report.
// Like the public report, the text is never stored; only the run's tokens and cost are logged.
atsRouter.post(
  "/ats-reviews",
  requireAuth,
  aiLimiter,
  ...validated({ body: createAtsReviewBody }, async (req, res) => {
    const userId = currentUser(req).id;
    const review = await reviewResume({ userId, ...req.body });
    track(userId, "ats_review_created", { withJob: Boolean(req.body.jobDescription), fixes: review.fixes.length });
    sendData(res, atsReview, review, 201);
  }),
);
