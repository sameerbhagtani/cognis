import { authClient } from "@/lib/auth";

export async function handleSignout() {
    await authClient.signOut();
}
