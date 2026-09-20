import { Stack } from "expo-router";
import useTheme from "@/lib/theme/useTheme";

export default function AuthLayout() {
    const { theme } = useTheme();
    return (
        <Stack
            initialRouteName="signin"
            screenOptions={{
                headerShown: false,
                contentStyle: {
                    backgroundColor: theme.background,
                },
                animation: "slide_from_right",
            }}
        >
            <Stack.Screen name="signup" />
            <Stack.Screen name="signin" />
            <Stack.Screen name="verify-email" />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="reset-password" />
        </Stack>
    );
}
