import { KeyboardAvoidingView, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";

import VerifyEmail from "@/modules/auth/screens/VerifyEmail";
import useTheme from "@/lib/theme/useTheme";

export default function VerifyEmailRoute() {
    const { themeMode } = useTheme();
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
        >
            <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
            <VerifyEmail />
        </KeyboardAvoidingView>
    );
}
