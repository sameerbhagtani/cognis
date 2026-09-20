import React, { useState } from "react";
import { Text, StyleSheet } from "react-native";
import { EdgeInsets, useSafeAreaInsets } from "react-native-safe-area-context";

import useTheme from "@/lib/theme/useTheme";
import type { Theme } from "@cognis/types";

export const AiChat = () => {
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const styles = createStyles(theme, insets);
    return <Text>Recent</Text>;
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
