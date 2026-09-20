import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    ActivityIndicator,
} from "react-native";
import { Link, useRouter } from "expo-router";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInschema, type SignInFormData } from "@/modules/auth/validation";

import useTheme from "@/lib/theme/useTheme";
import type { Theme } from "@cognis/types";

import { handleSignin } from "../api";

export default function Signin() {
    const { theme } = useTheme();
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;
    const router = useRouter();

    const styles = createStyles(theme, isLandscape);

    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [apiError, setApiError] = useState<string | null>(null);

    const {
        control,
        handleSubmit,
        formState: { errors, isValid, isSubmitting },
    } = useForm<SignInFormData>({
        resolver: zodResolver(signInschema),
        mode: "onBlur",
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onSubmit = async (data: SignInFormData) => {
        setApiError(null);
        const response = await handleSignin(data.email, data.password);
        if (response?.error) {
            setApiError(response.error);
        } else {
            // success, proceed to next screen (could be index)
            router.replace("/");
        }
    };

    const getBorderColor = (field: string, error?: any) => {
        if (error) return "#EF4444"; // Red for error
        return focusedField === field ? theme.primary : theme.subtleBorder;
    };

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
                        <Text style={styles.title}>Welcome Back</Text>
                        <Text style={styles.subtitle}>Sign in to access your notes</Text>
                    </View>

                    {/* API Error */}
                    {apiError && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorTextGlobal}>{apiError}</Text>
                        </View>
                    )}

                    {/* Email Input */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Email</Text>
                        <Controller
                            control={control}
                            name="email"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    value={value}
                                    onChangeText={onChange}
                                    placeholder="you@example.com"
                                    placeholderTextColor={theme.subtleBorder}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    onFocus={() => setFocusedField("email")}
                                    onBlur={() => {
                                        setFocusedField(null);
                                        onBlur();
                                    }}
                                    style={[
                                        styles.input,
                                        { borderColor: getBorderColor("email", errors.email) },
                                    ]}
                                />
                            )}
                        />
                        {errors.email && (
                            <Text style={styles.errorText}>{errors.email.message}</Text>
                        )}
                    </View>

                    {/* Password Input */}
                    <View style={styles.fieldGroupLast}>
                        <Text style={styles.label}>Password</Text>
                        <View>
                            <Controller
                                control={control}
                                name="password"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        value={value}
                                        onChangeText={onChange}
                                        placeholder="Your password"
                                        placeholderTextColor={theme.subtleBorder}
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        onFocus={() => setFocusedField("password")}
                                        onBlur={() => {
                                            setFocusedField(null);
                                            onBlur();
                                        }}
                                        style={[
                                            styles.input,
                                            styles.passwordInput,
                                            {
                                                borderColor: getBorderColor(
                                                    "password",
                                                    errors.password,
                                                ),
                                            },
                                        ]}
                                    />
                                )}
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
                        {errors.password && (
                            <Text style={styles.errorText}>{errors.password.message}</Text>
                        )}
                    </View>

                    {/* Sign In Button */}
                    <Pressable
                        onPress={handleSubmit(onSubmit)}
                        disabled={!isValid || isSubmitting}
                        style={({ pressed }) => [
                            styles.button,
                            { opacity: !isValid || isSubmitting ? 0.5 : pressed ? 0.85 : 1 },
                        ]}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.buttonText}>Sign In</Text>
                        )}
                    </Pressable>

                    {/* Sign Up Link */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Don&apos;t have an account?</Text>
                        <Link href="/signup" asChild>
                            <Pressable>
                                <Text style={styles.footerLink}>Sign Up</Text>
                            </Pressable>
                        </Link>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

function createStyles(theme: Theme, isLandscape: boolean) {
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

        // API Error
        errorContainer: {
            padding: 12,
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            borderWidth: 1,
            borderColor: "rgba(239, 68, 68, 0.5)",
            borderRadius: 12,
            marginBottom: 16,
        },
        errorTextGlobal: {
            color: "#EF4444",
            fontSize: 14,
            textAlign: "center",
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
            borderRadius: 12,
            paddingHorizontal: 16,
            fontSize: 16,
            color: theme.foreground,
            backgroundColor: theme.inputBg,
        },
        errorText: {
            color: "#EF4444",
            fontSize: 12,
            marginTop: 4,
            marginLeft: 4,
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
