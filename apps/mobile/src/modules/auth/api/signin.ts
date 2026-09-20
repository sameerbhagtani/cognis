import { authClient } from "@/lib/auth";

export async function handleSignin(email: string, password: string) {
    const { error, data } = await authClient.signIn.email({
        email,
        password,
    });

    if (error) {
        // Verification is required before sign-in; send the caller to the
        // verify-email screen instead of just surfacing a generic error.
        if (error.code === "EMAIL_NOT_VERIFIED") {
            return { unverified: true as const };
        }

        console.log(error);
        return { error: error.message || "An error occurred during sign in" };
    }
    return { data };
}
