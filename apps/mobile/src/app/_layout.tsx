import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { authClient } from "@/lib/auth";
import ThemeProvider from "@/lib/theme/ThemeProvider";

export default function RootLayout() {
    const { data: session, isPending } = authClient.useSession();

    if (isPending) {
        return null;
    }

    const isLoggedIn = Boolean(session);

    return (
        <SafeAreaProvider>
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
        </SafeAreaProvider>
    );
}
