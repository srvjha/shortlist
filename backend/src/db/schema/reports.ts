import { index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth.js";
import { createdAt } from "./columns.js";

// Problems users report from the app, also emailed to the admins.
export const reports = pgTable(
  "reports",
  {
    id: uuid().primaryKey().defaultRandom(),
    // Null when sent signed out. Deleting the account deletes its reports.
    userId: uuid().references(() => users.id, { onDelete: "cascade" }),
    email: text().notNull(),
    description: text().notNull(),
    // The page the report was sent from.
    page: text(),
    userAgent: text(),
    // The error the user was shown, when they reported from it.
    errorMessage: text(),
    errorCode: text(),
    errorStatus: integer(),
    errorPath: text(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.createdAt)],
);
