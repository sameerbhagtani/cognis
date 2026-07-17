import { pgTable, uuid, varchar, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

import { users } from "./users.js";

export const visibilityEnum = pgEnum("visibility", ["private", "shared", "public"]);

export const notes = pgTable("notes", {
    id: uuid("id").primaryKey().defaultRandom(),

    ownerId: uuid("owner_id")
        .references(() => users.id, { onDelete: "cascade" })
        .notNull(),

    title: varchar("title", { length: 255 }).notNull(),
    body: text("body").notNull(),
    visibility: visibilityEnum("visibility").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});
