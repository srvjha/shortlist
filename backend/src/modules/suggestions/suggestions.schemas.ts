import { z } from "zod";

export const suggestionParams = z.object({ resumeId: z.uuid(), suggestionId: z.uuid() });

export const createSuggestionBody = z.discriminatedUnion("type", [
  // Rewrites the resume for a job, using only facts from the resume and the master profile.
  z.object({ type: z.literal("tailor"), jobId: z.uuid(), instructions: z.string().trim().max(1000).optional() }),
  // Free-form request, optionally limited to specific sections, entries or bullets.
  z.object({
    type: z.literal("edit"),
    instruction: z.string().trim().min(3).max(1000),
    targetIds: z.array(z.string()).max(50).optional(),
  }),
  // Code-mode resumes that fail to compile.
  z.object({ type: z.literal("fix_compile") }),
]);

export const suggestionFeedbackBody = z.object({
  helpful: z.boolean(),
  comment: z.string().trim().max(2000).optional(),
  // The user agreed to be emailed about this feedback.
  contactOk: z.boolean().default(false),
});

export const suggestionType = z.enum(["tailor", "edit", "fix_compile"]);

const operationResponse = z.object({
  id: z.string(),
  type: z.enum([
    "update_bullet",
    "add_bullet",
    "update_headline",
    "set_hidden",
    "set_space_after",
    "reorder",
    "update_skills",
    "replace_source",
  ]),
  reason: z.string(),
  // Non-empty when the operation may add facts the user never gave, or its LaTeX doesn't compile.
  flags: z.array(z.string()),
  bulletId: z.string().optional(),
  afterBulletId: z.string().optional(),
  targetId: z.string().optional(),
  parentId: z.string().optional(),
  groupId: z.string().optional(),
  text: z.string().optional(),
  hidden: z.boolean().optional(),
  points: z.number().int().optional(),
  orderedIds: z.array(z.string()).optional(),
  items: z.array(z.string()).optional(),
  texSource: z.string().optional(),
});

export const suggestionResponse = z.object({
  id: z.uuid(),
  type: suggestionType,
  status: z.enum(["pending", "applied"]),
  baseVersionId: z.uuid(),
  appliedVersionId: z.uuid().nullable(),
  summary: z.string(),
  operations: z.array(operationResponse),
  // Like "openai:gpt-5.4-mini".
  model: z.string(),
  // Run on the user's own API key.
  byok: z.boolean(),
  // Millionths of a US dollar; null when the model's price is unknown.
  costUsdMicros: z.number().int().nullable(),
  createdAt: z.date(),
});

export const suggestionListResponse = z.array(suggestionResponse.omit({ operations: true }));

// Stored in ai_runs.patch_ops.
export const storedSuggestion = z.object({
  type: suggestionType,
  baseVersionId: z.uuid(),
  summary: z.string(),
  operations: z.array(z.record(z.string(), z.unknown())),
});

// Clamped, not rejected, so an over-long answer still applies. Same limits as skillGroup in resume-content.ts.
const skillItems = z
  .array(z.string())
  .nullable()
  .transform((items) => items?.slice(0, 40).map((item) => item.trim().slice(0, 60)) ?? null);

// What the model returns for structured resumes.
export const aiStructuredOutput = z.object({
  summary: z.string().describe("One or two sentences on what changed and why"),
  operations: z.array(
    z.object({
      type: z.enum([
        "update_bullet",
        "add_bullet",
        "update_headline",
        "set_hidden",
        "set_space_after",
        "reorder",
        "update_skills",
      ]),
      targetId: z
        .string()
        .nullable()
        .describe(
          "update_bullet: bullet id; add_bullet: id of the bullet the new one goes after; set_hidden: section, entry or bullet id; set_space_after: section or entry id; reorder: parent id (section id, entry id, or 'sections'); update_skills: skill group id; update_headline: null",
        ),
      text: z.string().nullable().describe("New text for update_bullet, add_bullet or update_headline"),
      hidden: z.boolean().nullable(),
      points: z
        .number()
        .int()
        .nullable()
        .describe("set_space_after: space below the target in points, -8 (tighter) to 24 (looser), 0 for the default"),
      orderedIds: z.array(z.string()).nullable().describe("reorder: every child id of the parent, in the new order"),
      items: skillItems.describe("update_skills: the group's items, reordered or trimmed"),
      reason: z.string().describe("Short reason shown to the user"),
    }),
  ),
});

// What the model returns for code-mode resumes.
export const aiCodeOutput = z.object({
  summary: z.string(),
  texSource: z.string().describe("The complete revised LaTeX document"),
  reason: z.string(),
});
