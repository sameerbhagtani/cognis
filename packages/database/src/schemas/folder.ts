import { pgTable, uuid, varchar, timestamp, index, type AnyPgColumn } from "drizzle-orm/pg-core";

import { workspace } from "./workspace.js";

export const folder = pgTable(
    "folder",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        workspaceId: uuid("workspace_id")
            .notNull()
            .references(() => workspace.id, { onDelete: "cascade" }),
        parentFolderId: uuid("parent_folder_id").references((): AnyPgColumn => folder.id, {
            onDelete: "cascade",
        }),

        name: varchar("name", { length: 50 }).notNull(),

        deletedAt: timestamp("deleted_at"),
        deletedBatchId: uuid("deleted_batch_id"),

        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        index("folder_parentFolderId_idx").on(table.parentFolderId),
        index("folder_workspaceId_deletedAt_idx").on(table.workspaceId, table.deletedAt),
        index("folder_deletedBatchId_idx").on(table.deletedBatchId),
    ],
);
