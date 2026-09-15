import Signup from "@/module/auth/screens/SignUp";
import { StatusBar } from "expo-status-bar";
import { KeyboardAvoidingView, Platform } from "react-native";
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
