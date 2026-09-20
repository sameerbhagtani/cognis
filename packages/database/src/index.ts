import { drizzle } from "drizzle-orm/node-postgres";
import env from "./env.js";

import * as schemas from "./schemas/index.js";

export const db = drizzle(env.DATABASE_URL);

export { schemas };

// Re-exported by name because it is a plain constant rather than a table, and
// consumers need it to assert their embedding model matches the column type.
export { EMBEDDING_DIMENSIONS } from "./schemas/embedding.js";

// Re-exported so consumers build queries with this package's drizzle instance
// rather than resolving a second copy of the ORM.
export * from "drizzle-orm";
