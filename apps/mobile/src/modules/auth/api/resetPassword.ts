import { authClient } from "@/lib/auth";

export async function handleResetPassword(newPassword: string, token: string) {
    const { error } = await authClient.resetPassword({ newPassword, token });

    if (error) {
        return { error: error.message || "Could not reset your password" };
    }
    return {};
}
