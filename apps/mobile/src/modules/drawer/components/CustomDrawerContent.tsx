import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets, type EdgeInsets } from "react-native-safe-area-context";
import { usePathname, useRouter } from "expo-router";
// expo-router ships its own copy of these navigation types; the ones from
// @react-navigation/drawer are structurally incompatible with what its Drawer
// actually hands to drawerContent.
import type { DrawerContentComponentProps } from "expo-router/drawer";

import useTheme from "@/lib/theme/useTheme";
import { useWorkspace } from "@/lib/workspace";
import { ModeSwitch, type DrawerMode } from "./ModeSwitch";
import { WorkspaceBar } from "./WorkspaceBar";

import type { Theme } from "@cognis/types";

/**
 * Mode is read off the route rather than stored separately - the route already
 * survives the drawer opening and closing, and two sources of truth for "which
 * mode am I in" would only drift.
 */
function modeFromPathname(pathname: string): DrawerMode {
    return pathname.startsWith("/chat") ? "ai" : "notes";
}

export function CustomDrawerContent(props: DrawerContentComponentProps) {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const pathname = usePathname();
    const { isLoading, error, refresh, selectWorkspace } = useWorkspace();

    const styles = createStyles(theme, insets);
    const mode = modeFromPathname(pathname);

    const [isPopupOpen, setIsPopupOpen] = useState(false);

    function closeDrawer() {
        setIsPopupOpen(false);
        props.navigation.closeDrawer();
    }

    function onSelectMode(next: DrawerMode) {
        // Already here: just get out of the way rather than re-navigating and
        // throwing away whatever the user was looking at.
        if (next === mode) {
            closeDrawer();
            return;
        }

        closeDrawer();
        router.replace(next === "ai" ? "/chat" : "/");
    }

    function navigateTo(path: "/create-workspace" | "/invite-member" | "/settings") {
        closeDrawer();
        router.push(path);
    }

    return (
        <View style={styles.container}>
            <ModeSwitch mode={mode} onSelect={onSelectMode} />

            <View style={styles.middle}>
                {isLoading ? (
                    <Text style={styles.placeholder}>Loading…</Text>
                ) : error ? (
                    <>
                        <Text style={styles.error}>{error}</Text>
                        <Text style={styles.retry} onPress={() => void refresh()}>
                            Try again
                        </Text>
                    </>
                ) : (
                    <Text style={styles.placeholder}>
                        {mode === "notes"
                            ? "Your notes will show up here."
                            : "Your chats will show up here."}
                    </Text>
                )}
            </View>

            <WorkspaceBar
                isPopupOpen={isPopupOpen}
                onTogglePopup={() => setIsPopupOpen((open) => !open)}
                onCreateWorkspace={() => navigateTo("/create-workspace")}
                onInviteMember={() => navigateTo("/invite-member")}
                onOpenSettings={() => navigateTo("/settings")}
                onSwitchWorkspace={(workspaceId) => {
                    selectWorkspace(workspaceId);
                    closeDrawer();
                }}
            />
        </View>
    );
}

function createStyles(theme: Theme, insets: EdgeInsets) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.background,
            paddingTop: Math.max(insets.top, 12),
        },
        middle: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
            gap: 8,
        },
        placeholder: {
            fontSize: 14,
            color: theme.foreground,
            opacity: 0.5,
            textAlign: "center",
        },
        error: {
            fontSize: 14,
            color: theme.danger,
            textAlign: "center",
        },
        retry: {
            fontSize: 14,
            fontWeight: "600",
            color: theme.primary,
        },
    });
}
