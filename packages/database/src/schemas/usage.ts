import {
    pgTable,
    uuid,
    text,
    varchar,
    integer,
    timestamp,
    index,
    pgEnum,
} from "drizzle-orm/pg-core";

import { user } from "./auth.js";
import { workspace } from "./workspace.js";
import { note } from "./note.js";
import { message } from "./chat.js";

export const aiUsageKindEnum = pgEnum("ai_usage_kind", ["completion", "embedding"]);

/**
 * One row per paid API call — the billing ledger.
 *
 * Stores raw token counts, never money, so a price change leaves history valid;
 * cost is computed from a price table at read time. Current spend is a sum over
 * a rolling window rather than a counter, which is what makes the window
 * adjustable and pricing plans possible later.
 *
 * The optional references are SET NULL rather than CASCADE on purpose: deleting
 * a chat or purging a note must not erase the record of what it cost.
 */
export const aiUsage = pgTable(
    "ai_usage",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        workspaceId: uuid("workspace_id").references(() => workspace.id, {
            onDelete: "set null",
        }),

        kind: aiUsageKindEnum("kind").notNull(),
        model: varchar("model", { length: 100 }).notNull(),

        inputTokens: integer("input_tokens").notNull(),
        outputTokens: integer("output_tokens").notNull(),

        // Exactly one of these is set, depending on kind.
        messageId: uuid("message_id").references(() => message.id, { onDelete: "set null" }),
        noteId: uuid("note_id").references(() => note.id, { onDelete: "set null" }),

        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        // The spend check before every paid call: one user, last 24 hours.
        index("ai_usage_userId_createdAt_idx").on(table.userId, table.createdAt),

        // These three exist for the SET NULL above, not for any query we write.
        // When a note is purged or a chat deleted, Postgres has to find the rows
        // pointing at it to clear the reference, once per deleted parent row.
        // Without an index that is a full scan of a table which only ever grows,
        // so deleting a workspace would get slower for the life of the product.
        index("ai_usage_workspaceId_idx").on(table.workspaceId),
        index("ai_usage_messageId_idx").on(table.messageId),
        index("ai_usage_noteId_idx").on(table.noteId),
    ],
);

/**
 * Per-user spend overrides, in micro-dollars per rolling day. Integers rather
 * than a float, so repeated addition cannot drift.
 *
 * Each column is independently nullable: setting only the chat budget leaves
 * indexing on its default, and no row at all means both defaults apply.
 */
export const userAiLimit = pgTable("user_ai_limit", {
    userId: text("user_id")
        .primaryKey()
        .references(() => user.id, { onDelete: "cascade" }),

    chatDailyMicros: integer("chat_daily_micros"),
    indexingDailyMicros: integer("indexing_daily_micros"),

    // Why this override exists, for whoever reads the table in six months.
    reason: text("reason"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});
