import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { expo } from "@better-auth/expo";

import { db, schemas } from "@cognis/database";
import env from "../shared/config/env.js";

export const auth = betterAuth({
    database: drizzleAdapter(db, { provider: "pg", schema: schemas }),
    plugins: [expo()],
    trustedOrigins: [
        "cognis://",
        ...(env.NODE_ENV === "development" ? ["exp://", "exp://**", "exp://192.168.*.*:*/**"] : []),
    ],
    emailAndPassword: {
        enabled: true,
    },
});
