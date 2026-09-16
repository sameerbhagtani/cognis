import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";

import { db, schemas } from "@cognis/database";
import { sendResetPasswordEmail, sendVerificationEmail } from "./email/index.js";
import env from "../shared/config/env.js";

export const auth = betterAuth({
    database: drizzleAdapter(db, { provider: "pg", schema: schemas }),
    trustedOrigins: [env.CLIENT_URL],
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        sendResetPassword: async ({ user, url }) => {
            await sendResetPasswordEmail(user.email, url);
        },
    },
    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url }) => {
            await sendVerificationEmail(user.email, url);
        },
    },
});
