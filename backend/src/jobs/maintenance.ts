import { and, eq, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { aiRuns, resumes, subscriptions, uploads, users } from "../db/schema/index.js";
import { logger } from "../lib/logger.js";
import { storage } from "../lib/storage.js";
import { recomputePlan } from "../modules/billing/billing.service.js";

const DAY = 24 * 60 * 60 * 1000;

// Season Passes and cancelled Basic plans end when their period ends. Also covers missed webhooks.
export async function expireSubscriptions() {
  const lapsed = await db
    .update(subscriptions)
    .set({ status: "expired" })
    .where(
      and(
        inArray(subscriptions.status, ["active", "cancelled", "past_due"]),
        isNotNull(subscriptions.currentPeriodEnd),
        lt(subscriptions.currentPeriodEnd, new Date()),
      ),
    )
    .returning({ userId: subscriptions.userId });

  const userIds = [...new Set(lapsed.map((row) => row.userId))];
  for (const userId of userIds) await recomputePlan(userId);
  logger.info({ expired: lapsed.length, users: userIds.length }, "Expired subscriptions");
}

// Deleted resumes can be recovered for 30 days; after that they're removed for good.
// AI runs keep their usage numbers for quotas and billing, but their prompts and patches go.
export async function purgeDeletedResumes() {
  const purged = await db.transaction(async (tx) => {
    const due = await tx
      .select({ id: resumes.id })
      .from(resumes)
      .where(and(isNotNull(resumes.deletedAt), lt(resumes.deletedAt, new Date(Date.now() - 30 * DAY))));
    const ids = due.map((row) => row.id);
    if (ids.length === 0) return 0;
    // Each operation becomes an empty object, so the count quotas read from patchOps stays the same.
    await tx
      .update(aiRuns)
      .set({
        patchOps: sql`case when jsonb_typeof(${aiRuns.patchOps}->'operations') = 'array' then jsonb_build_object('operations', coalesce((select jsonb_agg('{}'::jsonb) from jsonb_array_elements(${aiRuns.patchOps}->'operations')), '[]'::jsonb)) end`,
        acceptedOpIds: null,
        error: null,
      })
      .where(inArray(aiRuns.resumeId, ids));
    await tx.delete(resumes).where(inArray(resumes.id, ids));
    return ids.length;
  });
  logger.info({ purged }, "Purged deleted resumes");
}

// Uploads only matter during import; the extracted content lives in resumes.
// Files go before their rows: if a file can't be deleted, its row stays and the next run retries it.
export async function purgeOldUploads() {
  const old = await db
    .select({ id: uploads.id, storageKey: uploads.storageKey })
    .from(uploads)
    .where(lt(uploads.createdAt, new Date(Date.now() - 30 * DAY)));
  let purged = 0;
  for (const { id, storageKey } of old) {
    try {
      await storage.deletePrefix(storageKey);
    } catch (err) {
      logger.error({ err, storageKey }, "Could not delete upload file; will retry");
      continue;
    }
    await db.delete(uploads).where(eq(uploads.id, id));
    purged++;
  }
  logger.info({ purged, failed: old.length - purged }, "Purged old uploads");
}

// Compiled PDFs are cached by a hash of their LaTeX, shared across users, so they can't be tied to an account.
// Anything cached over 30 days ago is dropped (a read does not refresh its age) and recompiled if needed.
export async function purgeCompiledPdfs() {
  const removed = await storage.deleteOlder("compiled/", new Date(Date.now() - 30 * DAY));
  logger.info({ removed }, "Purged cached PDFs");
}

// Guest accounts are for trying the app; they and their data go after 7 days. Files go before the account, as in uploads.
export async function purgeGuestUsers() {
  const guests = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.isAnonymous, true), lt(users.createdAt, new Date(Date.now() - 7 * DAY))));
  let purged = 0;
  for (const { id } of guests) {
    try {
      await storage.deletePrefix(`users/${id}/`);
    } catch (err) {
      logger.error({ err, userId: id }, "Could not delete guest files; will retry");
      continue;
    }
    await db.delete(users).where(eq(users.id, id));
    purged++;
  }
  logger.info({ purged, failed: guests.length - purged }, "Purged guest users");
}

export const maintenanceTasks = {
  "expire-subscriptions": expireSubscriptions,
  "purge-deleted-resumes": purgeDeletedResumes,
  "purge-old-uploads": purgeOldUploads,
  "purge-compiled-pdfs": purgeCompiledPdfs,
  "purge-guest-users": purgeGuestUsers,
} as const;

export type MaintenanceTask = keyof typeof maintenanceTasks;
