import { DarkTheme, DefaultTheme } from "expo-router";

import type { Theme } from "@cognis/types";
import type { ThemeMode } from "./types";

/**
 * React Navigation paints its own scene containers, and expo-router defaults it
 * to DefaultTheme - whose background is rgb(242, 242, 242). That layer sits
 * above the native root view and below our screens, so it's what shows through
 * any gap: most visibly the strip a KeyboardAvoidingView vacates while the
 * keyboard animates in, which reads as a white flash against a dark theme.
 *
 * The base theme is spread rather than rebuilt so `fonts` and anything else
 * React Navigation adds later comes along for free.
 */
export function buildNavigationTheme(theme: Theme, themeMode: ThemeMode) {
    const base = themeMode === "dark" ? DarkTheme : DefaultTheme;

    return {
        ...base,
        colors: {
            ...base.colors,
            background: theme.background,
            card: theme.background,
            text: theme.foreground,
            border: theme.subtleBorder,
            primary: theme.primary,
        },
    };
}
