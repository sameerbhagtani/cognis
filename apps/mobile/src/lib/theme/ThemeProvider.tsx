import { useEffect, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import * as SystemUI from "expo-system-ui";

import { asyncStorage, STORAGE_KEYS } from "@/lib/storage";
import ThemeContext from "./ThemeContext";

import { dark, light } from "@cognis/constants";
import type { ThemePreference } from "./types";

export default function ThemeProvider({ children }: { children: ReactNode }) {
    const systemTheme = useColorScheme();

    const [themePreference, setThemePreference] = useState<ThemePreference | null>(null);

    useEffect(() => {
        asyncStorage.getItem(STORAGE_KEYS.theme).then((savedTheme) => {
            if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system") {
                setThemePreference(savedTheme);
            } else {
                setThemePreference("system");
            }
        });
    }, []);

    // Resolved before the early return below, so the effect that follows stays
    // unconditional. While the stored preference is still loading, the system
    // scheme is the best guess - and using it means the root view is already
    // the right colour on the very first frame.
    const themeMode =
        themePreference === null || themePreference === "system"
            ? systemTheme === "light"
                ? "light"
                : "dark"
            : themePreference;

    const theme = themeMode === "light" ? light : dark;

    // The native root view sits behind everything React renders, and defaults to
    // white. Anything that briefly exposes it - most visibly the gap while the
    // keyboard animates up - flashes white against a dark theme, so it has to
    // track the theme rather than stay at its default.
    useEffect(() => {
        void SystemUI.setBackgroundColorAsync(theme.background);
    }, [theme.background]);

    if (themePreference === null) {
        return null;
    }

    async function setTheme(newThemePreference: ThemePreference) {
        setThemePreference(newThemePreference);
        await asyncStorage.setItem(STORAGE_KEYS.theme, newThemePreference);
    }

    return (
        <ThemeContext.Provider
            value={{
                themeMode,
                themePreference,
                setTheme,
                theme,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}
