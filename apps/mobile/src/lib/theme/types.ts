import type { Theme } from "@cognis/types";

export type ThemePreference = "light" | "dark" | "system";
export type ThemeMode = "light" | "dark";

export type ThemeContextType = {
    themeMode: ThemeMode;
    themePreference: ThemePreference;
    setTheme: (themePreference: ThemePreference) => void;
    theme: Theme;
};
