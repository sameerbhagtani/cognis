import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    ScrollView,
    useWindowDimensions,
    ActivityIndicator,
} from "react-native";
import { Link, useLocalSearchParams } from "expo-router";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordFormData } from "@/modules/auth/validation";

import useTheme from "@/lib/theme/useTheme";
import { createAuthStyles, getFieldBorderColor } from "@/modules/auth/styles";

import { handleResetPassword } from "../api";

export default function ResetPassword() {
    const { theme } = useTheme();
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;
    const { token } = useLocalSearchParams<{ token?: string }>();

    const styles = createAuthStyles(theme, isLandscape);

    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [apiError, setApiError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors, isValid, isSubmitting },
    } = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
        mode: "onTouched",
        reValidateMode: "onChange",
        defaultValues: { password: "", confirmPassword: "" },
    });

    async function onSubmit(data: ResetPasswordFormData) {
        if (!token) return;

        setApiError(null);
        const response = await handleResetPassword(data.password, token);

        if (response?.error) {
            setApiError(response.error);
        } else {
            setDone(true);
        }
    }

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.formWrapper}>
                    <View style={styles.brandSection}>
                        <View style={styles.logoBox}>
                            <Text style={styles.logoGlyph}>C</Text>
                        </View>
                        <Text style={styles.title}>Set a new password</Text>
                    </View>

                    {!token ? (
                        <Text style={styles.errorTextGlobal}>
                            This reset link is invalid or has expired. Request a new one.
                        </Text>
                    ) : done ? (
                        <Text style={styles.successText}>
                            Your password has been reset. Sign in with your new password.
                        </Text>
                    ) : (
                        <>
                            {apiError && (
                                <View style={styles.errorContainer}>
                                    <Text style={styles.errorTextGlobal}>{apiError}</Text>
                                </View>
                            )}

                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>New password</Text>
                                <View>
                                    <Controller
                                        control={control}
                                        name="password"
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <TextInput
                                                value={value}
                                                onChangeText={onChange}
                                                placeholder="At least 8 characters"
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
                                                        borderColor: getFieldBorderColor(
                                                            theme,
                                                            focusedField === "password",
                                                            Boolean(errors.password),
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

                            <View style={styles.fieldGroupLast}>
                                <Text style={styles.label}>Confirm password</Text>
                                <Controller
                                    control={control}
                                    name="confirmPassword"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <TextInput
                                            value={value}
                                            onChangeText={onChange}
                                            placeholder="Type it again"
                                            placeholderTextColor={theme.subtleBorder}
                                            secureTextEntry={!showPassword}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            onFocus={() => setFocusedField("confirmPassword")}
                                            onBlur={() => {
                                                setFocusedField(null);
                                                onBlur();
                                            }}
                                            style={[
                                                styles.input,
                                                {
                                                    borderColor: getFieldBorderColor(
                                                        theme,
                                                        focusedField === "confirmPassword",
                                                        Boolean(errors.confirmPassword),
                                                    ),
                                                },
                                            ]}
                                        />
                                    )}
                                />
                                {errors.confirmPassword && (
                                    <Text style={styles.errorText}>
                                        {errors.confirmPassword.message}
                                    </Text>
                                )}
                            </View>

                            <Pressable
                                onPress={handleSubmit(onSubmit)}
                                disabled={!isValid || isSubmitting}
                                style={({ pressed }) => [
                                    styles.button,
                                    {
                                        opacity:
                                            !isValid || isSubmitting ? 0.5 : pressed ? 0.85 : 1,
                                    },
                                ]}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color="#ffffff" />
                                ) : (
                                    <Text style={styles.buttonText}>Reset password</Text>
                                )}
                            </Pressable>
                        </>
                    )}

                    <View style={styles.footer}>
                        <Link href="/signin" asChild>
                            <Pressable>
                                <Text style={styles.footerLink}>Back to Sign In</Text>
                            </Pressable>
                        </Link>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
