import { KeyboardAvoidingView, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";

import ForgotPassword from "@/modules/auth/screens/ForgotPassword";
import useTheme from "@/lib/theme/useTheme";

export default function ForgotPasswordRoute() {
    const { themeMode } = useTheme();
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
        >
            <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
            <ForgotPassword />
        </KeyboardAvoidingView>
    );
}
