import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";

import { db, schemas } from "@cognis/database";

export const auth = betterAuth({
    database: drizzleAdapter(db, { provider: "pg", schema: schemas }),
    emailAndPassword: {
        enabled: true,
    },
});
