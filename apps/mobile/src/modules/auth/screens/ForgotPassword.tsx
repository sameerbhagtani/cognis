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
import { Link } from "expo-router";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/modules/auth/validation";

import useTheme from "@/lib/theme/useTheme";
import { createAuthStyles, getFieldBorderColor } from "@/modules/auth/styles";

import { handleForgotPassword } from "../api";

export default function ForgotPassword() {
    const { theme } = useTheme();
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;

    const styles = createAuthStyles(theme, isLandscape);

    const [focused, setFocused] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors, isValid, isSubmitting },
    } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
        mode: "onTouched",
        reValidateMode: "onChange",
        defaultValues: { email: "" },
    });

    async function onSubmit(data: ForgotPasswordFormData) {
        setApiError(null);
        const response = await handleForgotPassword(data.email);

        if (response?.error) {
            setApiError(response.error);
        } else {
            setSent(true);
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
                        <Text style={styles.title}>Reset password</Text>
                        <Text style={styles.subtitle}>
                            Enter your email and we&apos;ll send you a reset link.
                        </Text>
                    </View>

                    {apiError && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorTextGlobal}>{apiError}</Text>
                        </View>
                    )}

                    {sent ? (
                        <Text style={styles.successText}>
                            If that email has an account, a reset link is on its way. Open it on
                            this device to continue.
                        </Text>
                    ) : (
                        <>
                            <View style={styles.fieldGroupLast}>
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
                                            onFocus={() => setFocused(true)}
                                            onBlur={() => {
                                                setFocused(false);
                                                onBlur();
                                            }}
                                            style={[
                                                styles.input,
                                                {
                                                    borderColor: getFieldBorderColor(
                                                        theme,
                                                        focused,
                                                        Boolean(errors.email),
                                                    ),
                                                },
                                            ]}
                                        />
                                    )}
                                />
                                {errors.email && (
                                    <Text style={styles.errorText}>{errors.email.message}</Text>
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
                                    <Text style={styles.buttonText}>Send reset link</Text>
                                )}
                            </Pressable>
                        </>
                    )}

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Remembered it?</Text>
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
