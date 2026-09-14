import { useEffect, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";

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

    if (themePreference === null) {
        return null;
    }

    const themeMode =
        themePreference === "system"
            ? systemTheme === "light"
                ? "light"
                : "dark"
            : themePreference;

    const theme = themeMode === "light" ? light : dark;

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
