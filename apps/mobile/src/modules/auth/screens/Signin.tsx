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
import { Link, useRouter } from "expo-router";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInschema, type SignInFormData } from "@/modules/auth/validation";

import useTheme from "@/lib/theme/useTheme";
import { createAuthStyles, getFieldBorderColor } from "@/modules/auth/styles";

import { handleSignin } from "../api";

export default function Signin() {
    const { theme } = useTheme();
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;
    const router = useRouter();

    const styles = createAuthStyles(theme, isLandscape);

    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [apiError, setApiError] = useState<string | null>(null);

    const {
        control,
        handleSubmit,
        formState: { errors, isValid, isSubmitting },
    } = useForm<SignInFormData>({
        resolver: zodResolver(signInschema),
        mode: "onTouched",
        reValidateMode: "onChange",
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onSubmit = async (data: SignInFormData) => {
        setApiError(null);
        const response = await handleSignin(data.email, data.password);

        if (response?.unverified) {
            router.push({ pathname: "/verify-email", params: { email: data.email } });
            return;
        }

        if (response?.error) {
            setApiError(response.error);
        } else {
            router.replace("/");
        }
    };

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
                        <Text style={styles.title}>Welcome Back</Text>
                        <Text style={styles.subtitle}>Sign in to access your notes</Text>
                    </View>

                    {apiError && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorTextGlobal}>{apiError}</Text>
                        </View>
                    )}

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
                                        {
                                            borderColor: getFieldBorderColor(
                                                theme,
                                                focusedField === "email",
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
                        <Link href="/forgot-password" asChild>
                            <Pressable>
                                <Text style={styles.footerLink}>Forgot password?</Text>
                            </Pressable>
                        </Link>
                    </View>

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
