type EmailTemplate = {
    subject: string;
    html: string;
};

const IGNORE_NOTE = "If you didn't request this, you can safely ignore this email.";

/**
 * Anything a user typed has to go through here before it reaches the markup.
 * Workspace and account names are free text, and a name like `<a href=...>` would
 * otherwise render as a real link inside an email that appears to come from us.
 */
function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function wrapper(title: string, bodyHtml: string, footer = IGNORE_NOTE): string {
    return `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="margin-bottom: 16px;">${title}</h2>
            ${bodyHtml}
            <p style="margin-top: 32px; font-size: 12px; color: #888;">
                ${footer}
            </p>
        </div>
    `;
}

export function resetPasswordEmail(url: string): EmailTemplate {
    return {
        subject: "Reset your Cognis password",
        html: wrapper(
            "Reset your password",
            `
                <p>We received a request to reset your Cognis password. Click the link below to choose a new one:</p>
                <p><a href="${url}" style="color: #2563eb;">Reset password</a></p>
                <p>This link expires in 1 hour.</p>
            `,
        ),
    };
}

export function verificationEmail(url: string): EmailTemplate {
    return {
        subject: "Verify your Cognis email address",
        html: wrapper(
            "Verify your email",
            `
                <p>Welcome to Cognis! Please verify your email address to activate your account:</p>
                <p><a href="${url}" style="color: #2563eb;">Verify email</a></p>
            `,
        ),
    };
}

type WorkspaceInvite = {
    workspaceName: string;
    invitedByName: string;
    role: string;
    url: string;
};

export function workspaceInviteEmail({
    workspaceName,
    invitedByName,
    role,
    url,
}: WorkspaceInvite): EmailTemplate {
    const roleNote =
        role === "viewer"
            ? "You can read everything in it, but not make changes."
            : "You can create and edit folders and notes in it.";

    return {
        // Subject is plain text, so it takes the raw values; only the HTML body
        // needs escaping.
        subject: `${invitedByName} added you to ${workspaceName} on Cognis`,
        html: wrapper(
            "You've been added to a workspace",
            `
                <p><strong>${escapeHtml(invitedByName)}</strong> added you to <strong>${escapeHtml(workspaceName)}</strong> as ${escapeHtml(role)}.</p>
                <p>${roleNote}</p>
                <p><a href="${url}" style="color: #2563eb;">Open Cognis</a></p>
            `,
            "You're receiving this because someone added you to their workspace. If that wasn't expected, ask them to remove you.",
        ),
    };
}
