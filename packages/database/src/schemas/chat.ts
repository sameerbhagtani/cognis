import { pgTable, uuid, varchar, text, timestamp, index, pgEnum } from "drizzle-orm/pg-core";

import { user } from "./auth.js";
import { workspace } from "./workspace.js";

// No "system" role: the system prompt is assembled per request from the note
// index and retrieved chunks, so storing it would only persist a stale copy.
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);

/**
 * A conversation. Scoped to a workspace, because that is the set of notes it can
 * read, and owned by one user — chats are private even from other members.
 */
export const chat = pgTable(
    "chat",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        workspaceId: uuid("workspace_id")
            .notNull()
            .references(() => workspace.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),

        title: varchar("title", { length: 100 }).notNull(),

        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        // One index for the one query that lists chats: always scoped to a
        // workspace and a user, always newest first. Carrying updatedAt as the
        // third column means the ordering comes out of the index rather than
        // needing a sort afterwards.
        //
        // nullsFirst matters: a plain ORDER BY ... DESC means DESC NULLS FIRST
        // in Postgres, and an index built NULLS LAST does not satisfy it, so the
        // planner would add the sort straight back.
        index("chat_workspaceId_userId_updatedAt_idx").on(
            table.workspaceId,
            table.userId,
            table.updatedAt.desc().nullsFirst(),
        ),
    ],
);

/**
 * One turn. Messages are never edited, so there is no updatedAt.
 *
 * citedNoteIds is a plain array rather than a join table: a cited note may later
 * be deleted, and the message has to survive that with its text intact.
 */
export const message = pgTable(
    "message",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        chatId: uuid("chat_id")
            .notNull()
            .references(() => chat.id, { onDelete: "cascade" }),

        role: messageRoleEnum("role").notNull(),
        content: text("content").notNull(),
        citedNoteIds: uuid("cited_note_ids").array(),

        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [index("message_chatId_createdAt_idx").on(table.chatId, table.createdAt)],
);
