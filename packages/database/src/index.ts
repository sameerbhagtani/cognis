import { drizzle } from "drizzle-orm/node-postgres";
import env from "./env.js";

export const db = drizzle(env.DATABASE_URL);

export * from "./schemas/users.js";
export * from "./schemas/notes.js";
export * from "./schemas/note-shares.js";
export * from "./schemas/tasks.js";
