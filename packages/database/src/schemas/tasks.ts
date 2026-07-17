import { pgTable, uuid, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";

import { users } from "./users.js";

export const tasks = pgTable("tasks", {
    id: uuid("id").primaryKey().defaultRandom(),

    ownerId: uuid("owner_id")
        .references(() => users.id, { onDelete: "cascade" })
        .notNull(),

    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),

    deadline: timestamp("deadline"),
    completed: boolean("completed").default(false).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
    completedAt: timestamp("completed_at"),
});
