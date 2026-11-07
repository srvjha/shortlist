import { z } from "zod";
import { USERNAME_PATTERN } from "./usernames.js";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(USERNAME_PATTERN, "Use 3-30 lowercase letters, digits or hyphens, not starting or ending with a hyphen");

export const meResponse = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  username: z.string(),
  plan: z.enum(["free", "season_pass", "pro", "lifetime"]),
  isAnonymous: z.boolean(),
  isAdmin: z.boolean(),
  createdAt: z.date(),
});

export const updateMeBody = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    username: usernameSchema.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, "Provide at least one field to update");

export const usernameParams = z.object({ username: z.string().trim().toLowerCase() });

export const usernameResponse = z.object({
  username: z.string(),
  available: z.boolean(),
});
