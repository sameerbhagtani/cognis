import { authClient } from "@/lib/auth";

export async function handleSignup(name: string, email: string, password: string) {
    const { error } = await authClient.signUp.email({
        name,
        email,
        password,
    });

    if (error) {
        console.log(error);
        return;
    }
}
