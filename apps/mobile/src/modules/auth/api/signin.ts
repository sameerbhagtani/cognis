import { authClient } from "@/lib/auth";

export async function handleSignin(email: string, password: string) {
    const { error } = await authClient.signIn.email({
        email,
        password,
    });

    if (error) {
        console.log(error);
        return;
    }
}
