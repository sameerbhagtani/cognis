import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import useTheme from "@/lib/theme/useTheme";

import type { Theme } from "@cognis/types";

export type DrawerMode = "notes" | "ai";

const MODES: {
    value: DrawerMode;
    label: string;
    icon: keyof (typeof MaterialCommunityIcons)["glyphMap"];
}[] = [
    { value: "notes", label: "Notes", icon: "file-document-outline" },
    { value: "ai", label: "AI", icon: "creation-outline" },
];

type ModeSwitchProps = {
    mode: DrawerMode;
    onSelect: (mode: DrawerMode) => void;
};

export function ModeSwitch({ mode, onSelect }: ModeSwitchProps) {
    const { theme } = useTheme();
    const styles = createStyles(theme);

    return (
        <View style={styles.container}>
            {MODES.map((item) => {
                const active = item.value === mode;

                return (
                    <Pressable
                        key={item.value}
                        onPress={() => onSelect(item.value)}
                        style={({ pressed }) => [
                            styles.button,
                            active && styles.buttonActive,
                            { opacity: pressed ? 0.7 : 1 },
                        ]}
                    >
                        <MaterialCommunityIcons
                            name={item.icon}
                            size={18}
                            color={active ? theme.primary : theme.foreground}
                        />
                        <Text style={[styles.label, active && styles.labelActive]}>
                            {item.label}
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
            gap: 8,
            paddingHorizontal: 12,
            paddingBottom: 12,
        },
        button: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: theme.inputBg,
        },
        buttonActive: {
            backgroundColor: `${theme.primary}1a`,
        },
        label: {
            fontSize: 14,
            fontWeight: "600",
            color: theme.foreground,
        },
        labelActive: {
            color: theme.primary,
        },
    });
}
