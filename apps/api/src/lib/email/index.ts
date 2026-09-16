import { sendEmail } from "./brevo.js";
import { resetPasswordEmail, verificationEmail } from "./templates.js";
import env from "../../shared/config/env.js";

export async function sendResetPasswordEmail(to: string, url: string) {
    if (env.NODE_ENV === "development") console.log(`[dev] Reset password url for ${to}: ${url}`);

    const { subject, html } = resetPasswordEmail(url);
    await sendEmail({ to, subject, html });
}

export async function sendVerificationEmail(to: string, url: string) {
    if (env.NODE_ENV === "development") console.log(`[dev] Verification url for ${to}: ${url}`);

    const { subject, html } = verificationEmail(url);
    await sendEmail({ to, subject, html });
}
