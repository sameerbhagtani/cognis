import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets, EdgeInsets } from "react-native-safe-area-context";
import useTheme from "@/lib/theme/useTheme";
import type { Theme } from "@cognis/types";

export const DrawerBottomBar = () => {
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const styles = createStyles(theme, insets);

    return (
        <View style={styles.container}>
            <Pressable style={styles.actionButton}>
                <Text style={styles.actionText}>⚙️ Settings</Text>
            </Pressable>
            <Pressable style={styles.actionButton}>
                <Text style={styles.actionText}>👤 Profile</Text>
            </Pressable>
        </View>
    );
};

const createStyles = (theme: Theme, insets: EdgeInsets) =>
    StyleSheet.create({
        container: {
            flexDirection: "row",
            borderTopWidth: 1,
            borderTopColor: theme.subtleBorder,
            paddingBottom: Math.max(insets.bottom, 16),
            paddingHorizontal: 16,
            paddingTop: 16,
            justifyContent: "space-around",
            backgroundColor: theme.background,
        },
        actionButton: {
            padding: 8,
        },
        actionText: {
            fontSize: 14,
            color: theme.foreground,
            fontWeight: "500",
        },
    });
