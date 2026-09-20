import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets, type EdgeInsets } from "react-native-safe-area-context";

import useTheme from "@/lib/theme/useTheme";
import { useWorkspace } from "@/lib/workspace";

import type { Theme } from "@cognis/types";

type WorkspaceBarProps = {
    isPopupOpen: boolean;
    onTogglePopup: () => void;
    onCreateWorkspace: () => void;
    onInviteMember: () => void;
    onOpenSettings: () => void;
    onSwitchWorkspace: (workspaceId: string) => void;
};

/**
 * The drawer's footer: which workspace you're in, a way to switch, and a way
 * into settings. The switcher opens upward as a panel inside the drawer rather
 * than a Modal - it belongs to the drawer's own surface, and a Modal would sit
 * above it.
 */
export function WorkspaceBar({
    isPopupOpen,
    onTogglePopup,
    onCreateWorkspace,
    onInviteMember,
    onOpenSettings,
    onSwitchWorkspace,
}: WorkspaceBarProps) {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const { workspaces, activeWorkspace } = useWorkspace();

    const styles = createStyles(theme, insets);
    const isOwner = activeWorkspace?.role === "owner";

    return (
        <View>
            {isPopupOpen && (
                <View style={styles.popup}>
                    <ScrollView style={styles.popupList} keyboardShouldPersistTaps="handled">
                        {workspaces.map((workspace) => {
                            const active = workspace.id === activeWorkspace?.id;

                            return (
                                <Pressable
                                    key={workspace.id}
                                    onPress={() => onSwitchWorkspace(workspace.id)}
                                    style={({ pressed }) => [
                                        styles.popupRow,
                                        { opacity: pressed ? 0.7 : 1 },
                                    ]}
                                >
                                    <Text style={styles.popupRowText} numberOfLines={1}>
                                        {workspace.name}
                                    </Text>
                                    {active && (
                                        <MaterialCommunityIcons
                                            name="check"
                                            size={16}
                                            color={theme.primary}
                                        />
                                    )}
                                </Pressable>
                            );
                        })}
                    </ScrollView>

                    <View style={styles.popupDivider} />

                    {isOwner && (
                        <Pressable
                            onPress={onInviteMember}
                            style={({ pressed }) => [
                                styles.popupRow,
                                { opacity: pressed ? 0.7 : 1 },
                            ]}
                        >
                            <MaterialCommunityIcons
                                name="account-plus-outline"
                                size={16}
                                color={theme.foreground}
                            />
                            <Text style={styles.popupActionText}>Invite someone</Text>
                        </Pressable>
                    )}

                    <Pressable
                        onPress={onCreateWorkspace}
                        style={({ pressed }) => [styles.popupRow, { opacity: pressed ? 0.7 : 1 }]}
                    >
                        <MaterialCommunityIcons name="plus" size={16} color={theme.foreground} />
                        <Text style={styles.popupActionText}>Create workspace</Text>
                    </Pressable>
                </View>
            )}

            <View style={styles.bar}>
                <Pressable
                    onPress={onTogglePopup}
                    style={({ pressed }) => [
                        styles.workspaceButton,
                        { opacity: pressed ? 0.7 : 1 },
                    ]}
                >
                    <Text style={styles.workspaceName} numberOfLines={1}>
                        {activeWorkspace?.name ?? "No workspace"}
                    </Text>
                    <MaterialCommunityIcons
                        name={isPopupOpen ? "chevron-down" : "chevron-up"}
                        size={18}
                        color={theme.foreground}
                    />
                </Pressable>

                <Pressable
                    onPress={onOpenSettings}
                    hitSlop={8}
                    style={({ pressed }) => [styles.settingsButton, { opacity: pressed ? 0.7 : 1 }]}
                >
                    <MaterialCommunityIcons name="cog-outline" size={20} color={theme.foreground} />
                </Pressable>
            </View>
        </View>
    );
}

function createStyles(theme: Theme, insets: EdgeInsets) {
    return StyleSheet.create({
        bar: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            borderTopWidth: 1,
            borderTopColor: theme.subtleBorder,
            paddingHorizontal: 12,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 12),
            backgroundColor: theme.background,
        },
        workspaceButton: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 6,
            paddingVertical: 8,
            paddingHorizontal: 10,
            borderRadius: 10,
            backgroundColor: theme.inputBg,
        },
        workspaceName: {
            flex: 1,
            fontSize: 14,
            fontWeight: "600",
            color: theme.foreground,
        },
        settingsButton: {
            padding: 8,
        },
        popup: {
            marginHorizontal: 12,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: theme.subtleBorder,
            borderRadius: 12,
            backgroundColor: theme.background,
            overflow: "hidden",
        },
        // Capped so a long list scrolls inside the popup instead of pushing the
        // drawer's own content off the top.
        popupList: {
            maxHeight: 220,
        },
        popupRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingVertical: 12,
            paddingHorizontal: 12,
        },
        popupRowText: {
            flex: 1,
            fontSize: 14,
            color: theme.foreground,
        },
        popupActionText: {
            fontSize: 14,
            fontWeight: "600",
            color: theme.foreground,
        },
        popupDivider: {
            height: 1,
            backgroundColor: theme.subtleBorder,
        },
    });
}
