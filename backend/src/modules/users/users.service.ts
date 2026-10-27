import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  jobs,
  profiles,
  resumes,
  resumeVersions,
  shareLinks,
  subscriptions,
  uploads,
  usernameRedirects,
  users,
} from "../../db/schema/index.js";
import { ConflictError, NotFoundError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { razorpay } from "../../lib/razorpay.js";
import { storage } from "../../lib/storage.js";
import { isReservedUsername, isUsernameTaken, usernameCooldownEnd } from "./usernames.js";

const meColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  emailVerified: users.emailVerified,
  image: users.image,
  username: users.username,
  plan: users.plan,
  isAnonymous: users.isAnonymous,
  createdAt: users.createdAt,
};

export async function getMe(userId: string) {
  const [user] = await db.select(meColumns).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new NotFoundError("User");
  return user;
}

export async function updateMe(userId: string, changes: { name?: string | undefined; username?: string | undefined }) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select(meColumns).from(users).where(eq(users.id, userId)).limit(1);
    if (!current) throw new NotFoundError("User");

    const update: Partial<typeof users.$inferInsert> = {};
    if (changes.name) update.name = changes.name;

    if (changes.username && changes.username !== current.username) {
      const next = changes.username;
      const [cooldown] = await tx
        .select({ usernameChangedAt: users.usernameChangedAt })
        .from(users)
        .where(eq(users.id, userId));
      const coolingDown = usernameCooldownEnd(cooldown!.usernameChangedAt);
      if (coolingDown) {
        throw new ConflictError(
          `You can change your username again after ${coolingDown.toLocaleDateString("en-IN", { dateStyle: "long" })}.`,
        );
      }
      if (isReservedUsername(next)) throw new ConflictError("This username is reserved");

      // A user may take back one of their own old usernames.
      const [ownRedirect] = await tx
        .select()
        .from(usernameRedirects)
        .where(and(eq(usernameRedirects.oldUsername, next), eq(usernameRedirects.userId, userId)));
      if (ownRedirect) {
        await tx.delete(usernameRedirects).where(eq(usernameRedirects.oldUsername, next));
      } else if (await isUsernameTaken(next, tx)) {
        throw new ConflictError("This username is taken");
      }

      await tx.insert(usernameRedirects).values({ oldUsername: current.username, userId });
      update.username = next;
      update.usernameChangedAt = new Date();
    }

    if (Object.keys(update).length === 0) return current;
    const [updated] = await tx.update(users).set(update).where(eq(users.id, userId)).returning(meColumns);
    return updated!;
  });
}

// Deletes the account, the user's files and, through foreign key cascades, every row they own.
export async function deleteMe(userId: string) {
  const activePro = await db
    .select({ remoteId: subscriptions.providerSubscriptionId })
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.plan, "pro"), eq(subscriptions.status, "active")));
  for (const { remoteId } of activePro) {
    if (!remoteId) continue;
    // Stop future charges; a failure here must not block deletion.
    await razorpay("POST", `/subscriptions/${remoteId}/cancel`, { cancel_at_cycle_end: 0 }).catch((err) =>
      logger.error({ err, remoteId }, "Could not cancel subscription during account deletion"),
    );
  }
  await storage.deletePrefix(`users/${userId}/`);
  await db.delete(users).where(eq(users.id, userId));
}

// Everything we store about the user, for data portability requests.
export async function exportMyData(userId: string) {
  const me = await getMe(userId);
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  const resumeRows = await db.select().from(resumes).where(eq(resumes.userId, userId)).orderBy(asc(resumes.createdAt));
  const versions = resumeRows.length
    ? await db
        .select()
        .from(resumeVersions)
        .where(
          inArray(
            resumeVersions.resumeId,
            resumeRows.map((r) => r.id),
          ),
        )
        .orderBy(asc(resumeVersions.createdAt))
    : [];
  const [jobRows, links, uploadRows, subscriptionRows] = await Promise.all([
    db.select().from(jobs).where(eq(jobs.userId, userId)),
    db.select().from(shareLinks).where(eq(shareLinks.userId, userId)),
    db.select().from(uploads).where(eq(uploads.userId, userId)),
    db.select().from(subscriptions).where(eq(subscriptions.userId, userId)),
  ]);
  return {
    exportedAt: new Date(),
    account: me,
    profile: profile?.data ?? null,
    resumes: resumeRows.map((resume) => ({ ...resume, versions: versions.filter((v) => v.resumeId === resume.id) })),
    jobs: jobRows,
    shareLinks: links.map(
      ({ passwordHash: _passwordHash, contactPasswordHash: _contactPasswordHash, ...link }) => link,
    ),
    uploads: uploadRows,
    subscriptions: subscriptionRows,
  };
}
