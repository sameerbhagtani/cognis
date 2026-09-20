import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { expo } from "@better-auth/expo";

import { db, schemas } from "@cognis/database";
import { sendResetPasswordEmail, sendVerificationEmail } from "./email/index.js";
import env from "../shared/config/env.js";

export const auth = betterAuth({
    database: drizzleAdapter(db, { provider: "pg", schema: schemas }),
    plugins: [expo()],
    trustedOrigins: [
        env.CLIENT_URL,
        "cognis://",
        ...(env.NODE_ENV === "development" ? ["exp://", "exp://**", "exp://192.168.*.*:*/**"] : []),
    ],
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
