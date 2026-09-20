import { authClient } from "@/lib/auth";

export async function handleSignup(name: string, email: string, password: string) {
    const { error, data } = await authClient.signUp.email({
        name,
        email,
        password,
        // Without this, Better Auth defaults the post-verification redirect to
        // "/" and resolves it against the API's own origin - a route our API
        // doesn't serve, so the link 404s. Point it at the app instead.
        //
        // The `verified=1` marker is ours, not Better Auth's - it redirects to
        // this exact string unchanged on success, so baking our own flag into
        // it is how the screen tells "opened from a successful verification
        // link" apart from "just signed up, still waiting."
        callbackURL: "cognis://verify-email?verified=1",
    });

    if (error) {
        console.log(error);
        return { error: error.message || "An error occurred during sign up" };
    }
    return { data };
}
