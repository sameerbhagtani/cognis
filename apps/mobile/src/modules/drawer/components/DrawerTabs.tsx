import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import useTheme from "@/lib/theme/useTheme";
import type { Theme } from "@cognis/types";

type DrawerTabsProps = {
    activeTab: number;
    onTabPress: (tab: number) => void;
};

export function DrawerTabs({ activeTab, onTabPress }: DrawerTabsProps) {
    const { theme } = useTheme();
    const styles = createStyles(theme);

    return (
        <View style={styles.container}>
            <Pressable
                style={[styles.tab, activeTab === 0 && styles.activeTab]}
                onPress={() => onTabPress(0)}
            >
                <Text style={[styles.tabText, activeTab === 0 && styles.activeTabText]}>Files</Text>
            </Pressable>
            <Pressable
                style={[styles.tab, activeTab === 1 && styles.activeTab]}
                onPress={() => onTabPress(1)}
            >
                <Text style={[styles.tabText, activeTab === 1 && styles.activeTabText]}>
                    AI Chat
                </Text>
            </Pressable>
        </View>
    );
}

const createStyles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flexDirection: "row",
            backgroundColor: theme.inputBg,
            borderRadius: 8,
            padding: 4,
            marginHorizontal: 16,
            marginBottom: 8,
        },
        tab: {
            flex: 1,
            paddingVertical: 6,
            alignItems: "center",
            borderRadius: 6,
        },
        activeTab: {
            backgroundColor: theme.background,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
        },
        tabText: {
            fontSize: 14,
            fontWeight: "500",
            color: theme.foreground,
        },
        activeTabText: {
            color: "#ecebeb",
        },
    });
