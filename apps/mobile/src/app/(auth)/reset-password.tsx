import { KeyboardAvoidingView, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";

import ResetPassword from "@/modules/auth/screens/ResetPassword";
import useTheme from "@/lib/theme/useTheme";

export default function ResetPasswordRoute() {
    const { themeMode } = useTheme();
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
        >
            <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
            <ResetPassword />
        </KeyboardAvoidingView>
    );
}
