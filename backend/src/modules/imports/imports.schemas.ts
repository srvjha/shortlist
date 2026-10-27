import { z } from "zod";
import { resumeContentSchema } from "../../schemas/resume-content.js";
import { resumeLayoutSchema } from "../../templates/layout.js";

// Pasted text and uploaded text or LaTeX files share this limit; a resume is far shorter.
export const MAX_IMPORT_TEXT = 50_000;

export const createImportBody = z.union([
  z.object({ uploadId: z.uuid() }),
  z.object({ text: z.string().trim().min(20).max(MAX_IMPORT_TEXT) }),
]);

export const createDraftBody = z.object({
  role: z.string().trim().min(2).max(100),
  notes: z.string().trim().min(40).max(20_000),
});

// A GitHub repo or any public page, or pasted text for a private repo. Notes say what the user did on the project.
const projectNotes = { notes: z.string().trim().max(2000).optional() };
export const createProjectDraftBody = z.union([
  z.object({ url: z.url({ protocol: /^https?$/ }).max(500), ...projectNotes }),
  z.object({ text: z.string().trim().min(40).max(20_000), ...projectNotes }),
]);

export const projectDraftResponse = z.object({
  // A projects-section entry for the client to review, then add or swap in for an existing one.
  project: z.object({
    id: z.string(),
    name: z.string(),
    url: z.string().optional(),
    technologies: z.array(z.string()),
    // flags: terms the source and notes never mention, for the user to check.
    bullets: z.array(z.object({ id: z.string(), text: z.string(), flags: z.array(z.string()) })),
  }),
  aiRunId: z.uuid(),
});

export const importResponse = z.object({
  content: resumeContentSchema,
  aiRunId: z.uuid(),
  // PDF lines the AI left out. Placed ones are already in content as hidden bullets; the rest had no entry to go under.
  missed: z.array(z.object({ text: z.string(), placed: z.boolean() })).default([]),
  // How the source PDF showed its header links, when it named them ("LinkedIn") instead of printing the address.
  linkStyle: resumeLayoutSchema.shape.links,
});
