import type { ReactNode } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DrawerActions } from "@react-navigation/native";
import { useNavigation } from "expo-router";

import useTheme from "@/lib/theme/useTheme";

import type { Theme } from "@cognis/types";

type ScreenHeaderProps = {
    title?: string;
    /** Rendered on the right, e.g. the editor's read/edit toggle. */
    action?: ReactNode;
};

/** The one way into the drawer, since every screen under (app) hides the native header. */
export function ScreenHeader({ title, action }: ScreenHeaderProps) {
    const { theme } = useTheme();
    const navigation = useNavigation();
    const styles = createStyles(theme);

    return (
        <View style={styles.container}>
            <Pressable
                onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
                hitSlop={8}
                style={({ pressed }) => [styles.menuButton, { opacity: pressed ? 0.7 : 1 }]}
            >
                <MaterialCommunityIcons name="menu" size={22} color={theme.foreground} />
            </Pressable>

            {title ? (
                <Text style={styles.title} numberOfLines={1}>
                    {title}
                </Text>
            ) : (
                <View style={styles.spacer} />
            )}

            <View style={styles.action}>{action}</View>
        </View>
    );
}

function createStyles(theme: Theme) {
    return StyleSheet.create({
        container: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 8,
        },
        menuButton: {
            padding: 4,
        },
        title: {
            flex: 1,
            fontSize: 16,
            fontWeight: "600",
            color: theme.foreground,
        },
        spacer: {
            flex: 1,
        },
        action: {
            minWidth: 30,
            alignItems: "flex-end",
        },
    });
}
