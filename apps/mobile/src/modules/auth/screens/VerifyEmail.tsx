import { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useLayout } from "@/lib/hooks/useLayout";
import useTheme from "@/lib/theme/useTheme";
import { createAuthStyles } from "@/modules/auth/styles";

import { handleResendVerification } from "../api";

const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyEmail() {
    const { theme } = useTheme();
    const { isLandscape } = useLayout();
    const router = useRouter();
    // `verified` isn't a Better Auth param - it's our own marker baked into the
    // callbackURL we send it, so this screen can tell "opened from a
    // successful verification link" apart from "just signed up, still
    // waiting" - Better Auth's redirect carries no signal of its own on
    // success. `error` IS Better Auth's own param, appended to that same
    // callbackURL when the token is expired/invalid/already used - it lands
    // right alongside `verified=1`, so it has to be checked first or an
    // expired link would still show as a success.
    const { email, verified, error } = useLocalSearchParams<{
        email?: string;
        verified?: string;
        error?: string;
    }>();
    const isVerified = verified === "1" && !error;

    const styles = createAuthStyles(theme, isLandscape);

    const [cooldown, setCooldown] = useState(0);
    const [isSending, setIsSending] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    async function onResend() {
        if (!email || cooldown > 0 || isSending) return;

        setIsSending(true);
        setApiError(null);

        const response = await handleResendVerification(email);

        setIsSending(false);

        if (response?.error) {
            setApiError(response.error);
            return;
        }

        setSent(true);
        setCooldown(RESEND_COOLDOWN_SECONDS);

        const interval = setInterval(() => {
            setCooldown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
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
                        <Text style={styles.title}>
                            {error
                                ? "Link expired"
                                : isVerified
                                  ? "Email verified"
                                  : "Check your email"}
                        </Text>
                        <Text style={styles.subtitle}>
                            {error
                                ? "This verification link is invalid or has expired. Sign in and we'll send you a new one."
                                : isVerified
                                  ? "Your email is confirmed. Sign in to get started."
                                  : email
                                    ? `If ${email} hasn't already been registered, we've sent a verification link to it. Open it, then come back and sign in.`
                                    : "If this email hasn't already been registered, we've sent a verification link to it. Open it, then come back and sign in."}
                        </Text>
                    </View>

                    {error ? (
                        <Pressable
                            onPress={() => router.replace("/signin")}
                            style={({ pressed }) => [
                                styles.button,
                                { opacity: pressed ? 0.85 : 1 },
                            ]}
                        >
                            <Text style={styles.buttonText}>Go to Sign In</Text>
                        </Pressable>
                    ) : isVerified ? (
                        <Pressable
                            onPress={() => router.replace("/signin")}
                            style={({ pressed }) => [
                                styles.button,
                                { opacity: pressed ? 0.85 : 1 },
                            ]}
                        >
                            <Text style={styles.buttonText}>Continue to Sign In</Text>
                        </Pressable>
                    ) : (
                        <>
                            {apiError && (
                                <View style={styles.errorContainer}>
                                    <Text style={styles.errorTextGlobal}>{apiError}</Text>
                                </View>
                            )}

                            {sent && !apiError && (
                                <Text style={[styles.successText, { marginBottom: 16 }]}>
                                    Verification email sent again.
                                </Text>
                            )}

                            <Pressable
                                onPress={onResend}
                                disabled={!email || cooldown > 0 || isSending}
                                style={({ pressed }) => [
                                    styles.button,
                                    {
                                        opacity:
                                            !email || cooldown > 0 || isSending
                                                ? 0.5
                                                : pressed
                                                  ? 0.85
                                                  : 1,
                                    },
                                ]}
                            >
                                <Text style={styles.buttonText}>
                                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
                                </Text>
                            </Pressable>

                            {/* Better Auth silently fakes a success response for a signup
                             *  with an already-registered email (anti-enumeration - never
                             *  confirms or denies which emails exist), so someone in that
                             *  situation lands here with an email that will never arrive.
                             *  This nudges them toward the right recovery path without ever
                             *  stating the email is already registered. */}
                            <Text
                                style={[styles.footerText, { textAlign: "center", marginTop: 20 }]}
                            >
                                Already have an account with this email?{" "}
                                <Text
                                    style={styles.footerLink}
                                    onPress={() => router.push("/signin")}
                                >
                                    Sign in
                                </Text>
                                , or{" "}
                                <Text
                                    style={styles.footerLink}
                                    onPress={() => router.push("/forgot-password")}
                                >
                                    reset your password
                                </Text>{" "}
                                if you&apos;ve forgotten it.
                            </Text>
                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
