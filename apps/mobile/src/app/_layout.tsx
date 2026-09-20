import { useState } from "react";
import { Stack } from "expo-router";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { authClient } from "@/lib/auth";
import ThemeProvider from "@/lib/theme/ThemeProvider";

export default function RootLayout() {
    const { data: session, isPending } = authClient.useSession();

    // Better Auth refetches the session after every auth call (sign in, sign
    // up, sign out, ...), not just on first load - isPending flips back to
    // true for those too. Gating the whole tree on it, unconditionally, would
    // unmount every navigator on each refetch and reset any nested stack back
    // to its initial route. Only the very first resolution should block.
    //
    // A one-way latch, set during render rather than in an effect - React's
    // documented pattern for adjusting state as a prop changes, which fires
    // before paint instead of adding an extra effect-driven render pass.
    const [prevIsPending, setPrevIsPending] = useState(isPending);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(!isPending);

    if (isPending !== prevIsPending) {
        setPrevIsPending(isPending);
        if (!isPending) setHasLoadedOnce(true);
    }

    if (!hasLoadedOnce) {
        return null;
    }

    const isLoggedIn = Boolean(session);

    return (
        <SafeAreaProvider>
            <KeyboardProvider>
                <ThemeProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Protected guard={!isLoggedIn}>
                            <Stack.Screen name="(auth)" />
                        </Stack.Protected>

                        <Stack.Protected guard={isLoggedIn}>
                            <Stack.Screen name="(app)" />
                        </Stack.Protected>
                    </Stack>
                </ThemeProvider>
            </KeyboardProvider>
        </SafeAreaProvider>
    );
}
