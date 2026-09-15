import { Stack } from "expo-router";
import ThemeProvider from "@/lib/theme/ThemeProvider";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
    const isLoggedIn = false;
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
