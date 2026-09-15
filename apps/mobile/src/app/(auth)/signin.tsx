import useTheme from "@/lib/theme/useTheme";
import Signin from "@/module/auth/screens/SignIn";
import { StatusBar } from "expo-status-bar";
import { KeyboardAvoidingView, Platform } from "react-native";

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
