import {
    pgTable,
    uuid,
    varchar,
    text,
    timestamp,
    pgEnum,
    index,
    unique,
} from "drizzle-orm/pg-core";

import { user } from "./auth.js";

export const workspaceMemberRoleEnum = pgEnum("workspace_member_role", [
    "owner",
    "editor",
    "viewer",
]);

export const workspace = pgTable("workspace", {
    id: uuid("id").primaryKey().defaultRandom(),

    ownerId: text("owner_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 50 }).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

export const workspaceMember = pgTable(
    "workspace_member",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        workspaceId: uuid("workspace_id")
            .notNull()
            .references(() => workspace.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),

        role: workspaceMemberRoleEnum("role").notNull(),

        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        index("workspace_member_userId_idx").on(table.userId),
        unique("workspace_member_workspaceId_userId_unique").on(table.workspaceId, table.userId),
    ],
);
