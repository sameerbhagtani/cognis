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
import { signUpschema, type SignUpFormData } from "@/modules/auth/validation";

import useTheme from "@/lib/theme/useTheme";
import { createAuthStyles, getFieldBorderColor } from "@/modules/auth/styles";

import { handleSignup } from "../api";

export default function Signup() {
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
    } = useForm<SignUpFormData>({
        resolver: zodResolver(signUpschema),
        mode: "onTouched",
        reValidateMode: "onChange",
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    async function onSubmit(data: SignUpFormData) {
        setApiError(null);
        const response = await handleSignup(data.name, data.email, data.password);

        if (response?.error) {
            setApiError(response.error);
        } else {
            // Verification is required before sign-in, so there's no session
            // to land on the app with yet.
            router.replace({ pathname: "/verify-email", params: { email: data.email } });
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
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Start organizing your notes with Cognis</Text>
                    </View>

                    {apiError && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorTextGlobal}>{apiError}</Text>
                        </View>
                    )}

                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Name</Text>
                        <Controller
                            control={control}
                            name="name"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    value={value}
                                    onChangeText={onChange}
                                    placeholder="Your name"
                                    placeholderTextColor={theme.subtleBorder}
                                    autoCapitalize="words"
                                    autoCorrect={false}
                                    onFocus={() => setFocusedField("userName")}
                                    onBlur={() => {
                                        setFocusedField(null);
                                        onBlur();
                                    }}
                                    style={[
                                        styles.input,
                                        {
                                            borderColor: getFieldBorderColor(
                                                theme,
                                                focusedField === "userName",
                                                Boolean(errors.name),
                                            ),
                                        },
                                    ]}
                                />
                            )}
                        />
                        {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}
                    </View>

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

                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Password</Text>
                        <View>
                            <Controller
                                control={control}
                                name="password"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        value={value}
                                        onChangeText={onChange}
                                        placeholder="Create a password"
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
                            <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>
                        )}
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
                            <Text style={styles.buttonText}>Continue</Text>
                        )}
                    </Pressable>

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
