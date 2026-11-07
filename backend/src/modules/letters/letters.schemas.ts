import { z } from "zod";

export const letterParams = z.object({ letterId: z.uuid() });

const title = z.string().trim().min(1).max(200);
const body = z.string().trim().min(1).max(10_000);

export const createLetterBody = z.discriminatedUnion("kind", [
  // The AI writes this one from a resume and a saved job.
  z.object({ kind: z.literal("cover"), resumeId: z.uuid(), jobId: z.uuid() }),
  // Written from a template in the browser, so it costs no AI and only needs saving.
  z.object({ kind: z.literal("resignation"), title, body }),
]);

export const updateLetterBody = z
  .object({ title: title.optional(), body: body.optional() })
  .refine((changes) => changes.title !== undefined || changes.body !== undefined, "Nothing to change");

export const letterPdfQuery = z.object({ download: z.stringbool().default(false) });

export const letterResponse = z.object({
  id: z.uuid(),
  kind: z.enum(["cover", "resignation"]),
  title: z.string(),
  body: z.string(),
  flags: z.array(z.string()),
  resumeId: z.uuid().nullable(),
  jobId: z.uuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const letterListResponse = z.array(letterResponse.omit({ body: true, flags: true }));

export const createPublicCoverLetterBody = z.object({
  resumeText: z.string().trim().min(200).max(15_000),
  jobDescription: z.string().trim().min(100).max(12_000),
});

export const publicCoverLetterResponse = z.object({ body: z.string(), flags: z.array(z.string()) });
