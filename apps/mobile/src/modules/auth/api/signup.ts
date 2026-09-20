import { authClient } from "@/lib/auth";

export async function handleSignup(name: string, email: string, password: string) {
    const { error, data } = await authClient.signUp.email({
        name,
        email,
        password,
    });

    if (error) {
        console.log(error);
        return { error: error.message || "An error occurred during sign up" };
    }
    return { data };
}
