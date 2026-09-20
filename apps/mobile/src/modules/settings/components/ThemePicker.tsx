import { Pressable, StyleSheet, Text, View } from "react-native";

import useTheme from "@/lib/theme/useTheme";

import type { Theme } from "@cognis/types";
import type { ThemePreference } from "@/lib/theme/types";

const OPTIONS: { value: ThemePreference; label: string }[] = [
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
    { value: "light", label: "Light" },
];

/** Segmented control over the preference, not the resolved mode - picking
 *  "System" has to stay distinguishable from picking whatever it resolves to. */
export function ThemePicker() {
    const { theme, themePreference, setTheme } = useTheme();
    const styles = createStyles(theme);

    return (
        <View style={styles.container}>
            {OPTIONS.map((option) => {
                const isSelected = option.value === themePreference;

                return (
                    <Pressable
                        key={option.value}
                        onPress={() => setTheme(option.value)}
                        style={({ pressed }) => [
                            styles.option,
                            isSelected && styles.optionSelected,
                            { opacity: pressed ? 0.7 : 1 },
                        ]}
                    >
                        <Text style={[styles.label, isSelected && styles.labelSelected]}>
                            {option.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

function createStyles(theme: Theme) {
    return StyleSheet.create({
        container: {
            flexDirection: "row",
            gap: 4,
            padding: 4,
            borderRadius: 12,
            backgroundColor: theme.inputBg,
        },
        option: {
            flex: 1,
            paddingVertical: 9,
            borderRadius: 9,
            alignItems: "center",
        },
        optionSelected: {
            backgroundColor: `${theme.primary}26`,
        },
        label: {
            fontSize: 14,
            color: theme.foreground,
            opacity: 0.6,
        },
        labelSelected: {
            color: theme.primary,
            opacity: 1,
            fontWeight: "600",
        },
    });
}
