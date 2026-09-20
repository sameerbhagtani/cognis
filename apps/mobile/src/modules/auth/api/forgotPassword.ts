import { authClient } from "@/lib/auth";

export async function handleForgotPassword(email: string) {
    // Points back into the app via the cognis:// scheme rather than a web
    // route, since there isn't one — the @better-auth/expo plugin is what
    // makes this land back on our own reset-password screen with a token.
    const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: "cognis://reset-password",
    });

    if (error) {
        return { error: error.message || "Could not send the reset email" };
    }
    return {};
}
