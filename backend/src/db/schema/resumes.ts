import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { ResumeLayout } from "../../templates/layout.js";
import { users } from "./auth.js";
import { createdAt, timestamps } from "./columns.js";

// The master profile: every fact the user has given us. Tailoring can only
// draw from this. One per user, current state only (no history for MVP).
export const profiles = pgTable("profiles", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  data: jsonb().notNull().default({}),
  schemaVersion: integer().notNull().default(1),
  ...timestamps,
});

// Template metadata. The .tex files themselves live in the repo.
export const templates = pgTable("templates", {
  id: text().primaryKey(), // slug, e.g. "jake"
  name: text().notNull(),
  description: text(),
  atsSafe: boolean().notNull().default(true),
  version: integer().notNull().default(1),
  isActive: boolean().notNull().default(true),
  ...timestamps,
});

// A job description the user pasted or linked, plus its parsed requirements.
export const jobs = pgTable(
  "jobs",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    company: text(),
    role: text(),
    sourceUrl: text(),
    rawText: text().notNull(),
    // SHA-256 of the normalized text, for a shared parse cache later.
    textHash: text().notNull(),
    parsed: jsonb(),
    ...timestamps,
  },
  (t) => [index().on(t.userId), index().on(t.textHash)],
);

export const resumeMode = pgEnum("resume_mode", ["structured", "code"]);

// One resume or variant. Metadata only: content lives in resume_versions.
export const resumes = pgTable(
  "resumes",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text().notNull(),
    mode: resumeMode().notNull().default("structured"),
    // Null in code mode, where the user's LaTeX is the whole document.
    templateId: text().references(() => templates.id),
    jobId: uuid().references(() => jobs.id, { onDelete: "set null" }),
    // Resume this variant was created from, if any.
    sourceResumeId: uuid().references((): AnyPgColumn => resumes.id, {
      onDelete: "set null",
    }),
    headVersionId: uuid().references((): AnyPgColumn => resumeVersions.id, {
      onDelete: "set null",
    }),
    pageLimit: integer().notNull().default(1),
    layout: jsonb().$type<ResumeLayout>().notNull().default({ spacing: "normal" }),
    archivedAt: timestamp({ withTimezone: true }),
    deletedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index().on(t.userId), index().on(t.jobId), index().on(t.sourceResumeId), index().on(t.headVersionId)],
);

export const versionKind = pgEnum("version_kind", [
  "import", // created from an uploaded or pasted resume
  "manual", // autosave of the user's own edits
  "ai", // an accepted AI change set
  "restore", // copy of an older version
  "named", // user-labelled checkpoint, e.g. "Sent to Google"
]);

// Immutable snapshots of a resume's content. Never updated, only appended.
export const resumeVersions = pgTable(
  "resume_versions",
  {
    id: uuid().primaryKey().defaultRandom(),
    resumeId: uuid()
      .notNull()
      .references(() => resumes.id, { onDelete: "cascade" }),
    parentId: uuid().references((): AnyPgColumn => resumeVersions.id, {
      onDelete: "set null",
    }),
    kind: versionKind().notNull(),
    // Structured mode stores JSON, code mode stores the .tex source.
    content: jsonb(),
    texSource: text(),
    label: text(),
    semver: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index().on(t.resumeId, t.createdAt),
    index().on(t.parentId),
    check("resume_versions_one_content", sql`(${t.content} is not null) <> (${t.texSource} is not null)`),
  ],
);

// A user's own starting point for new resumes: LaTeX they wrote, or a saved copy of a resume.
export const customTemplates = pgTable(
  "custom_templates",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text().notNull(),
    mode: resumeMode().notNull(),
    templateId: text().references(() => templates.id),
    content: jsonb(),
    texSource: text(),
    ...timestamps,
  },
  (t) => [
    index().on(t.userId),
    check(
      "custom_templates_body_matches_mode",
      sql`(${t.mode} = 'structured' AND ${t.content} IS NOT NULL) OR (${t.mode} = 'code' AND ${t.texSource} IS NOT NULL)`,
    ),
  ],
);

// One row for each version a Free account has downloaded as a PDF. There is no foreign key to the version, so deleting
// a resume doesn't give the download back.
export const pdfDownloads = pgTable(
  "pdf_downloads",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    versionId: uuid().notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.versionId] })],
);
