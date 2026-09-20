import { KeyboardAvoidingView, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";

import Signin from "@/modules/auth/screens/Signin";
import useTheme from "@/lib/theme/useTheme";

export default function SigninRoute() {
    const { themeMode } = useTheme();
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
        >
            <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
            <Signin />
        </KeyboardAvoidingView>
    );
}
