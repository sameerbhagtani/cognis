import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
} from "react-native";
import { Link } from "expo-router";
import useTheme from "@/lib/theme/useTheme";
import type { Theme } from "@cognis/types";
import type { ThemeMode } from "@/lib/theme/types";

export default function Signup() {
    const { theme, themeMode } = useTheme();
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;

    const styles = createStyles(theme, themeMode, isLandscape);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    function handleSignUp() {
        // TODO: wire up BetterAuth
        console.log("[Cognis Auth] Sign Up:", { name, email, password });
    }

    const isFormValid = name.trim() !== "" && email.trim() !== "" && password.trim() !== "";

    const inputBorderColor = (field: string) =>
        focusedField === field ? theme.primary : styles.input.borderColor;

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.formWrapper}>
                    {/* Logo / Brand */}
                    <View style={styles.brandSection}>
                        <View style={styles.logoBox}>
                            <Text style={styles.logoGlyph}>C</Text>
                        </View>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Start organizing your notes with Cognis</Text>
                    </View>

                    {/* Name Input */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Name</Text>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            placeholder="Your name"
                            placeholderTextColor={styles.input.borderColor as string}
                            autoCapitalize="words"
                            autoCorrect={false}
                            onFocus={() => setFocusedField("name")}
                            onBlur={() => setFocusedField(null)}
                            style={[styles.input, { borderColor: inputBorderColor("name") }]}
                        />
                    </View>

                    {/* Email Input */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            placeholder="you@example.com"
                            placeholderTextColor={styles.input.borderColor as string}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            onFocus={() => setFocusedField("email")}
                            onBlur={() => setFocusedField(null)}
                            style={[styles.input, { borderColor: inputBorderColor("email") }]}
                        />
                    </View>

                    {/* Password Input */}
                    <View style={styles.fieldGroupLast}>
                        <Text style={styles.label}>Password</Text>
                        <View>
                            <TextInput
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Create a password"
                                placeholderTextColor={styles.input.borderColor as string}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                onFocus={() => setFocusedField("password")}
                                onBlur={() => setFocusedField(null)}
                                style={[
                                    styles.input,
                                    styles.passwordInput,
                                    { borderColor: inputBorderColor("password") },
                                ]}
                            />
                            <Pressable
                                onPress={() => setShowPassword((prev) => !prev)}
                                style={styles.passwordToggle}
                            >
                                <Text style={styles.passwordToggleText}>
                                    {showPassword ? "Hide" : "Show"}
                                </Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* Sign Up Button */}
                    <Pressable
                        onPress={handleSignUp}
                        disabled={!isFormValid}
                        style={({ pressed }) => [
                            styles.button,
                            { opacity: !isFormValid ? 0.5 : pressed ? 0.85 : 1 },
                        ]}
                    >
                        <Text style={styles.buttonText}>Continue</Text>
                    </Pressable>

                    {/* Sign In Link */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account?</Text>
                        <Link href="/signin" asChild>
                            <Pressable>
                                <Text style={styles.footerLink}>Sign In</Text>
                            </Pressable>
                        </Link>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

function createStyles(theme: Theme, themeMode: ThemeMode, isLandscape: boolean) {
    const isDark = themeMode === "dark";
    const subtleBorder = isDark ? "rgba(240,240,240,0.15)" : "rgba(16,16,16,0.15)";
    const inputBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";

    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.background,
        },
        scrollContent: {
            flexGrow: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
            paddingVertical: isLandscape ? 24 : 48,
        },
        formWrapper: {
            width: "100%",
            maxWidth: isLandscape ? 500 : 400,
        },

        // Brand
        brandSection: {
            alignItems: "center",
            marginBottom: isLandscape ? 24 : 40,
        },
        logoBox: {
            width: isLandscape ? 60 : 76,
            height: isLandscape ? 60 : 76,
            borderRadius: 20,
            backgroundColor: theme.secondary,
            borderWidth: 2,
            borderColor: theme.primary,
            alignItems: "center",
            justifyContent: "center",
        },
        logoGlyph: {
            fontSize: isLandscape ? 28 : 36,
            color: theme.primary,
        },
        title: {
            fontSize: 28,
            fontWeight: "700",
            color: theme.foreground,
            marginTop: 16,
        },
        subtitle: {
            fontSize: 15,
            color: theme.foreground,
            opacity: 0.6,
            marginTop: 6,
        },

        // Form fields
        fieldGroup: {
            marginBottom: 16,
        },
        fieldGroupLast: {
            marginBottom: 24,
        },
        label: {
            fontSize: 14,
            fontWeight: "500",
            color: theme.foreground,
            opacity: 0.8,
            marginBottom: 6,
        },
        input: {
            height: 50,
            borderWidth: 1.5,
            borderColor: subtleBorder,
            borderRadius: 12,
            paddingHorizontal: 16,
            fontSize: 16,
            color: theme.foreground,
            backgroundColor: inputBg,
        },
        passwordInput: {
            paddingRight: 60,
        },
        passwordToggle: {
            position: "absolute",
            right: 16,
            top: 0,
            bottom: 0,
            justifyContent: "center",
        },
        passwordToggleText: {
            fontSize: 14,
            fontWeight: "600",
            color: theme.primary,
        },

        // Button
        button: {
            height: 50,
            borderRadius: 12,
            backgroundColor: theme.primary,
            alignItems: "center",
            justifyContent: "center",
        },
        buttonText: {
            fontSize: 16,
            fontWeight: "700",
            color: "#ffffff",
        },

        // Footer
        footer: {
            flexDirection: "row",
            justifyContent: "center",
            marginTop: 20,
            gap: 4,
        },
        footerText: {
            fontSize: 14,
            color: theme.foreground,
            opacity: 0.6,
        },
        footerLink: {
            fontSize: 14,
            fontWeight: "600",
            color: theme.primary,
        },
    });
}
