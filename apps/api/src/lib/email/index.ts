import { sendEmail } from "./brevo.js";
import { resetPasswordEmail, verificationEmail, workspaceInviteEmail } from "./templates.js";
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

type WorkspaceInviteInput = {
    to: string;
    workspaceName: string;
    invitedByName: string;
    role: string;
};

/**
 * Notifying the added user can't go over the socket: they have no connection to
 * that workspace's room, and won't until their client joins. Email is the only
 * channel that reaches them.
 *
 * Deliberately never throws. The membership row is already committed by the time
 * this runs, so a Brevo outage must not turn a completed action into a failed
 * request — the user would simply find the workspace next time they open the app.
 */
export function sendWorkspaceInviteEmail({
    to,
    workspaceName,
    invitedByName,
    role,
}: WorkspaceInviteInput) {
    const url = env.CLIENT_URL;

    if (env.NODE_ENV === "development") {
        console.log(`[dev] Workspace invite for ${to}: ${workspaceName} as ${role}`);
    }

    const { subject, html } = workspaceInviteEmail({ workspaceName, invitedByName, role, url });

    void sendEmail({ to, subject, html }).catch((err) => {
        console.error(`failed to send workspace invite email to ${to}`, err);
    });
}
