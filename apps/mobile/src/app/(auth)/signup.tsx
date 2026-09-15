import { KeyboardAvoidingView, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";

import Signup from "@/modules/auth/screens/Signup";
import useTheme from "@/lib/theme/useTheme";

export default function SignupRoute() {
    const { themeMode } = useTheme();
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
        >
            <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
            <Signup />
        </KeyboardAvoidingView>
    );
}
