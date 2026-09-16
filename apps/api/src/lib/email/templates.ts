type EmailTemplate = {
    subject: string;
    html: string;
};

function wrapper(title: string, bodyHtml: string): string {
    return `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="margin-bottom: 16px;">${title}</h2>
            ${bodyHtml}
            <p style="margin-top: 32px; font-size: 12px; color: #888;">
                If you didn't request this, you can safely ignore this email.
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
