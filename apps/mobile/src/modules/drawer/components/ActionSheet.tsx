import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Modal, Pressable, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets, type EdgeInsets } from "react-native-safe-area-context";

import useTheme from "@/lib/theme/useTheme";

import type { Theme } from "@cognis/types";

export type SheetAction = {
    label: string;
    icon: keyof (typeof MaterialCommunityIcons)["glyphMap"];
    destructive?: boolean;
    onPress: () => void;
};

type ActionSheetProps = {
    visible: boolean;
    title: string;
    actions: SheetAction[];
    onClose: () => void;
};

/**
 * A plain bottom sheet rather than ActionSheetIOS, which is iOS-only, or
 * Alert, which caps out at three buttons well below what a folder's menu needs.
 */
export function ActionSheet({ visible, title, actions, onClose }: ActionSheetProps) {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const styles = createStyles(theme, insets);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                {/* Stops a tap inside the sheet from reaching the backdrop. */}
                <Pressable style={styles.sheet} onPress={() => {}}>
                    <Text style={styles.title} numberOfLines={1}>
                        {title}
                    </Text>

                    {actions.map((action) => (
                        <Pressable
                            key={action.label}
                            onPress={() => {
                                onClose();
                                action.onPress();
                            }}
                            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
                        >
                            <MaterialCommunityIcons
                                name={action.icon}
                                size={20}
                                color={action.destructive ? theme.danger : theme.foreground}
                            />
                            <Text
                                style={[styles.rowText, action.destructive && styles.destructive]}
                            >
                                {action.label}
                            </Text>
                        </Pressable>
                    ))}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

function createStyles(theme: Theme, insets: EdgeInsets) {
    return StyleSheet.create({
        backdrop: {
            flex: 1,
            backgroundColor: "#00000080",
            justifyContent: "flex-end",
        },
        sheet: {
            backgroundColor: theme.background,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingTop: 16,
            paddingBottom: Math.max(insets.bottom, 16),
        },
        title: {
            fontSize: 13,
            fontWeight: "600",
            color: theme.foreground,
            opacity: 0.5,
            paddingHorizontal: 20,
            paddingBottom: 8,
        },
        row: {
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            paddingVertical: 14,
            paddingHorizontal: 20,
        },
        rowText: {
            fontSize: 15,
            color: theme.foreground,
        },
        destructive: {
            color: theme.danger,
        },
    });
}
