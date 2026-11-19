import { z } from "zod";

export const jobParams = z.object({ jobId: z.uuid() });

export const createJobBody = z.union([
  // A full job description, or just the role someone is aiming for ("Full stack engineer").
  z.object({ rawText: z.string().trim().min(2).max(30_000) }),
  z.object({ sourceUrl: z.url() }),
]);

// What the model extracts from a job description.
export const parsedJobSchema = z.object({
  company: z.string().nullable(),
  role: z.string().nullable(),
  seniority: z.enum(["intern", "entry", "mid", "senior", "lead", "unknown"]),
  domain: z.string().nullable().describe("e.g. fintech, e-commerce, developer tools"),
  mustHave: z.array(z.string()).describe("Required skills and qualifications, short phrases"),
  niceToHave: z.array(z.string()).describe("Preferred or bonus skills"),
  responsibilities: z.array(z.string()).describe("Main duties, short phrases"),
  keywords: z.array(z.string()).describe("Technologies and terms an ATS or recruiter would scan for"),
});

export const jobResponse = z.object({
  id: z.uuid(),
  company: z.string().nullable(),
  role: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  rawText: z.string(),
  parsed: parsedJobSchema.nullable(),
  createdAt: z.date(),
});

export const jobSummary = jobResponse.omit({ rawText: true, parsed: true });
export const jobListResponse = z.array(jobSummary);
