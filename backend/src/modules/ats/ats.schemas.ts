import { z } from "zod";

export const createResumeAtsReportBody = z.object({ jobId: z.uuid().optional() });

const coordinate = z.number().min(-10_000).max(10_000);
const size = z.number().min(0).max(10_000);

// One pdf.js text run, built as the header of parser/extract.ts describes.
const textItem = z.object({
  text: z.string().max(500),
  x: coordinate,
  y: coordinate,
  width: size,
  height: size,
  page: z.number().int().min(1).max(4),
  fontName: z.string().max(200).optional(),
  bold: z.boolean().optional(),
});

export const createAtsReportBody = z
  .object({
    text: z.string().trim().min(200).max(50_000),
    jobDescription: z.string().trim().max(20_000).optional(),
    // The PDF's text runs, read in the browser, so the parser can check layout. Sent with `page`.
    items: z.array(textItem).max(6000).optional(),
    page: z.object({ width: size.positive(), height: size.positive() }).optional(),
    // The uploaded file's details, read in the browser; the file itself is never sent.
    file: z
      .object({
        name: z.string().trim().min(1).max(255),
        sizeBytes: z.number().int().min(0).max(100_000_000),
        pages: z.number().int().min(1).max(500),
        // Links whose address isn't written in the visible text, like a URL behind an icon.
        hiddenLinks: z.array(z.string().max(500)).max(50).default([]),
      })
      .optional(),
  })
  .refine((body) => !body.items === !body.page, { message: "Send items and page together", path: ["page"] });

const skillLists = z.object({ matched: z.array(z.string()), missing: z.array(z.string()) });

export const atsReport = z
  .object({
    score: z.number().int().min(0).max(100),
    grade: z.enum(["excellent", "good", "fair", "poor"]),
    summary: z.string(),
    categories: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        score: z.number().int(),
        maxScore: z.number().int(),
        checks: z.array(
          z.object({
            id: z.string(),
            label: z.string(),
            status: z.enum(["pass", "warn", "fail"]),
            detail: z.string(),
            fix: z.string().nullable(),
            // The resume lines behind a failing check, with the word to highlight.
            lines: z.array(z.object({ text: z.string(), highlight: z.string().optional() })).optional(),
          }),
        ),
      }),
    ),
    // Null when no job was given. `matched` and `missing` are the hard skills. `implied` are missing hard skills
    // an AI check found the resume clearly implies, with the resume's words as evidence; they don't change the score.
    keywords: skillLists
      .extend({
        hard: skillLists,
        soft: skillLists,
        mustHaveMissing: z.array(z.string()),
        implied: z.array(z.object({ skill: z.string(), evidence: z.string() })),
      })
      .nullable(),
    // Null without a job, or when the job's title can't be read.
    title: z
      .object({ jobTitle: z.string(), best: z.string().nullable(), level: z.enum(["exact", "close", "none"]) })
      .nullable(),
    // What a parser read from the PDF. Null for pasted text; parseRate is null with nothing to compare against.
    parse: z
      .object({
        parseRate: z.number().min(0).max(1).nullable(),
        fields: z.array(
          z.object({
            id: z.string(),
            label: z.string(),
            found: z.string().nullable(),
            expected: z.string().nullable(),
            ok: z.boolean(),
          }),
        ),
      })
      .nullable(),
    // Requirements a recruiter checks by hand. Advisory: they never change the score. Null without a job.
    knockouts: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          requirement: z.string(),
          required: z.boolean(),
          status: z.enum(["met", "not-met", "unclear", "not-on-resume"]),
          evidence: z.string().nullable(),
          advice: z.string(),
          // The rules found it unclear and an AI check gave the status and evidence.
          checkedWithAi: z.boolean(),
        }),
      )
      .nullable(),
    stats: z.object({
      words: z.number().int(),
      bullets: z.number().int(),
      sections: z.array(z.string()),
      quantifiedBullets: z.number().int(),
    }),
  })
  .meta({ id: "AtsReport" });
