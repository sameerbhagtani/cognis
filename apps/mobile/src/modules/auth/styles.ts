import { StyleSheet } from "react-native";

import type { Theme } from "@cognis/types";

/** Shared visual language across every auth screen (sign in/up, verify, reset). */
export function createAuthStyles(theme: Theme, isLandscape: boolean) {
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
            textAlign: "center",
        },

        errorContainer: {
            padding: 12,
            backgroundColor: `${theme.danger}1a`,
            borderWidth: 1,
            borderColor: `${theme.danger}80`,
            borderRadius: 12,
            marginBottom: 16,
        },
        errorTextGlobal: {
            color: theme.danger,
            fontSize: 14,
            textAlign: "center",
        },

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
            // minHeight, not height: at a large system font size the text
            // inside grows, and a fixed height would clip it rather than let
            // the field grow with it.
            minHeight: 50,
            borderWidth: 1.5,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            fontSize: 16,
            color: theme.foreground,
            backgroundColor: theme.inputBg,
        },
        errorText: {
            color: theme.danger,
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

        button: {
            minHeight: 50,
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 16,
            backgroundColor: theme.primary,
            alignItems: "center",
            justifyContent: "center",
        },
        buttonText: {
            fontSize: 16,
            fontWeight: "700",
            color: "#ffffff",
        },

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

        successText: {
            fontSize: 15,
            color: theme.foreground,
            textAlign: "center",
            lineHeight: 22,
        },
    });
}

export function getFieldBorderColor(theme: Theme, focused: boolean, hasError: boolean): string {
    if (hasError) return theme.danger;
    return focused ? theme.primary : theme.subtleBorder;
}
