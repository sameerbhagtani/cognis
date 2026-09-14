import { Stack } from "expo-router";
import ThemeProvider from "@/lib/theme/ThemeProvider";

export default function RootLayout() {
    return (
        <ThemeProvider>
            <Stack screenOptions={{ headerShown: false }} />
        </ThemeProvider>
    );
}
