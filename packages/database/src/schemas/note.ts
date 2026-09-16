import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";

import { workspace } from "./workspace.js";
import { folder } from "./folder.js";

export const note = pgTable(
    "note",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        workspaceId: uuid("workspace_id")
            .notNull()
            .references(() => workspace.id, { onDelete: "cascade" }),
        folderId: uuid("folder_id").references(() => folder.id, { onDelete: "cascade" }),

        title: varchar("title", { length: 50 }).notNull(),
        content: text("content"),

        deletedAt: timestamp("deleted_at"),
        deletedBatchId: uuid("deleted_batch_id"),

        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        index("note_folderId_idx").on(table.folderId),
        index("note_workspaceId_deletedAt_idx").on(table.workspaceId, table.deletedAt),
        index("note_deletedBatchId_idx").on(table.deletedBatchId),
    ],
);
