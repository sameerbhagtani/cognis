import { authClient } from "@/lib/auth";

export async function handleResendVerification(email: string) {
    const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: "cognis://verify-email?verified=1",
    });

    if (error) {
        return { error: error.message || "Could not resend the verification email" };
    }
    return {};
}
