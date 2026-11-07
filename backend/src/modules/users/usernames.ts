import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { usernameRedirects, users } from "../../db/schema/index.js";

// Must match the users_username_format check constraint.
export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

const USERNAME_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

// Renames reserve the old name, so renaming often would park many names. Null means the user may rename now.
export function usernameCooldownEnd(changedAt: Date | null, now = new Date()) {
  if (!changedAt) return null;
  const end = new Date(changedAt.getTime() + USERNAME_COOLDOWN_MS);
  return end > now ? end : null;
}

// Names that would clash with app routes on the frontend domain.
// Every top-level frontend route must be listed, or that user's public page at /<username> is hidden.
const RESERVED = new Set([
  "about",
  "account",
  "admin",
  "analytics",
  "api",
  "app",
  "assets",
  "ats",
  "ats-checker",
  "auth",
  "billing",
  "blog",
  "cover-letter-generator",
  "dashboard",
  "docs",
  "edit",
  "guides",
  "help",
  "home",
  "jobs",
  "letters",
  "login",
  "logout",
  "me",
  "my-templates",
  "new",
  "pricing",
  "privacy",
  "profile",
  "public",
  "register",
  "resignation-letter-generator",
  "resume-format",
  "resume",
  "resumes",
  "settings",
  "share",
  "sign-in",
  "sign-up",
  "signin",
  "signup",
  "static",
  "status",
  "support",
  "templates",
  "terms",
  "u",
  "user",
  "users",
  "workspace",
  "www",
]);

export function isReservedUsername(username: string) {
  return RESERVED.has(username);
}

export function slugify(value: string, maxLength = 24) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}

export async function isUsernameTaken(username: string, executor: Pick<typeof db, "select"> = db) {
  const [user] = await executor.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  if (user) return true;
  const [redirect] = await executor
    .select({ oldUsername: usernameRedirects.oldUsername })
    .from(usernameRedirects)
    .where(eq(usernameRedirects.oldUsername, username))
    .limit(1);
  return Boolean(redirect);
}

export async function isUsernameAvailable(username: string) {
  return USERNAME_PATTERN.test(username) && !isReservedUsername(username) && !(await isUsernameTaken(username));
}

// "Saurav Jha" -> "saurav-jha", then "saurav-jha-4821" if taken; falls back to the email's local part.
export async function generateUsername(name: string | null | undefined, email: string) {
  let base = slugify(name ?? "");
  if (base.length < 3) base = slugify(email.split("@")[0] ?? "");
  if (base.length < 3) base = "user";

  if (await isUsernameAvailable(base)) return base;
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `${base}-${randomInt(1000, 10000)}`;
    if (await isUsernameAvailable(candidate)) return candidate;
  }
  return `user-${randomInt(10 ** 7, 10 ** 8)}`;
}
