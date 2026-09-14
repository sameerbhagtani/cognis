import { drizzle } from "drizzle-orm/node-postgres";
import env from "./env.js";

import * as schemas from "./schemas/index.js";

export const db = drizzle(env.DATABASE_URL);

export { schemas };
