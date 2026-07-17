import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";

import { notes } from "./notes.js";
import { users } from "./users.js";

export const noteShares = pgTable("note_shares", {
    id: uuid("id").primaryKey().defaultRandom(),

    noteId: uuid("note_id")
        .references(() => notes.id, { onDelete: "cascade" })
        .notNull(),

    sharedWithId: uuid("shared_with_id")
        .references(() => users.id, { onDelete: "cascade" })
        .notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
});
