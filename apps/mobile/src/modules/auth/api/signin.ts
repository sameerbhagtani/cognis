import { authClient } from "@/lib/auth";

export async function handleSignin(email: string, password: string) {
    const { error, data } = await authClient.signIn.email({
        email,
        password,
    });

    if (error) {
        console.log(error);
        return { error: error.message || "An error occurred during sign in" };
    }
    return { data };
}
