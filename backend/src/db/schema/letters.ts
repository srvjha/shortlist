import { index, jsonb, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth.js";
import { timestamps } from "./columns.js";
import { jobs, resumes } from "./resumes.js";

export const letterKind = pgEnum("letter_kind", ["cover", "resignation"]);

// A saved letter, so it can be reopened. There is no version history: an edit replaces the text.
export const letters = pgTable(
  "letters",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: letterKind().notNull(),
    title: text().notNull(),
    body: text().notNull(),
    // Terms the AI wrote that aren't in the resume or profile, as of when it wrote them.
    flags: jsonb().$type<string[]>().notNull().default([]),
    // The resume whose template the PDF follows, and the job the letter was written for.
    resumeId: uuid().references(() => resumes.id, { onDelete: "set null" }),
    jobId: uuid().references(() => jobs.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [index().on(t.userId)],
);
