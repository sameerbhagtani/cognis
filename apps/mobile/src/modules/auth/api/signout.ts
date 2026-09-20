import { authClient } from "@/lib/auth";
import { disconnectSocket } from "@/lib/socket";

export async function handleSignout() {
    await authClient.signOut();
    disconnectSocket();
}
