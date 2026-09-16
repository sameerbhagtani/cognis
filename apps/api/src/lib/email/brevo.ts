import axios from "axios";

import env from "../../shared/config/env.js";

const BREVO_SEND_EMAIL_URL = "https://api.brevo.com/v3/smtp/email";

type SendEmailInput = {
    to: string;
    subject: string;
    html: string;
};

export async function sendEmail({ to, subject, html }: SendEmailInput) {
    await axios.post(
        BREVO_SEND_EMAIL_URL,
        {
            sender: { name: env.EMAIL_FROM_NAME, email: env.EMAIL_FROM_ADDRESS },
            to: [{ email: to }],
            subject,
            htmlContent: html,
        },
        {
            headers: {
                accept: "application/json",
                "content-type": "application/json",
                "api-key": env.BREVO_API_KEY,
            },
        },
    );
}
