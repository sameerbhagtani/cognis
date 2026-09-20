import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import useTheme from "@/lib/theme/useTheme";
import type { Theme } from "@cognis/types";

interface Props {
    onClose: () => void;
}

export const DrawerHeader: React.FC<Props> = ({ onClose }) => {
    const { theme } = useTheme();
    const styles = createStyles(theme);

    return (
        <View style={styles.container}>
            <View style={styles.topRow}>
                <Text style={styles.title}>Workspace</Text>
                <Pressable onPress={onClose} style={styles.closeButton}>
                    <Text style={styles.closeText}>✕</Text>
                </Pressable>
            </View>
        </View>
    );
};

const createStyles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 8,
            borderBottomWidth: 1,
            borderBottomColor: theme.subtleBorder,
        },
        topRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
        },
        title: {
            fontSize: 18,
            fontWeight: "600",
            color: theme.foreground,
        },
        closeButton: {
            padding: 4,
        },
        closeText: {
            fontSize: 18,
            color: theme.foreground,
        },
    });
