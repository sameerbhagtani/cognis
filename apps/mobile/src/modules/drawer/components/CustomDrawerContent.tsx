import { useRef, useState } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets, type EdgeInsets } from "react-native-safe-area-context";
import { usePathname, useRouter } from "expo-router";
// expo-router ships its own copy of these navigation types; the ones from
// @react-navigation/drawer are structurally incompatible with what its Drawer
// actually hands to drawerContent.
import type { DrawerContentComponentProps } from "expo-router/drawer";

import { useChats } from "@/lib/chat";
import useTheme from "@/lib/theme/useTheme";
import { useWorkspace } from "@/lib/workspace";
import { createChat } from "@/modules/chat/api";
import { ChatList } from "./ChatList";
import { FileTree, type FileTreeHandle } from "./FileTree";
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
    const { activeWorkspace, isLoading, error, refresh, selectWorkspace } = useWorkspace();
    const { refresh: refreshChats } = useChats();

    const styles = createStyles(theme, insets);
    const mode = modeFromPathname(pathname);

    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const treeRef = useRef<FileTreeHandle>(null);

    const canWrite = activeWorkspace?.role === "owner" || activeWorkspace?.role === "editor";

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

    function navigateTo(path: "/create-workspace" | "/settings") {
        closeDrawer();
        router.push(path);
    }

    function openWorkspace(workspaceId: string) {
        closeDrawer();
        router.push({ pathname: "/workspace/[workspaceId]", params: { workspaceId } });
    }

    async function startChat() {
        if (!activeWorkspace) return;

        const chat = await createChat(activeWorkspace.id);

        await refreshChats();
        closeDrawer();
        router.push({ pathname: "/chat/[chatId]", params: { chatId: chat.id } });
    }

    return (
        <View style={styles.container}>
            <ModeSwitch mode={mode} onSelect={onSelectMode} />

            <View style={styles.middle}>
                {isLoading ? (
                    <Text style={styles.placeholder}>Loading…</Text>
                ) : error ? (
                    <View style={styles.centered}>
                        <Text style={styles.error}>{error}</Text>
                        <Text style={styles.retry} onPress={() => void refresh()}>
                            Try again
                        </Text>
                    </View>
                ) : mode === "notes" ? (
                    <FileTree
                        ref={treeRef}
                        onOpenNote={(noteId) => {
                            closeDrawer();
                            router.push({ pathname: "/note/[noteId]", params: { noteId } });
                        }}
                    />
                ) : (
                    <ChatList
                        onOpenChat={(chatId) => {
                            closeDrawer();
                            router.push({ pathname: "/chat/[chatId]", params: { chatId } });
                        }}
                    />
                )}
            </View>

            {mode === "notes" && canWrite && (
                <View style={styles.createRow}>
                    <Pressable
                        onPress={() => treeRef.current?.promptNewNote()}
                        hitSlop={8}
                        style={({ pressed }) => [
                            styles.createButton,
                            { opacity: pressed ? 0.6 : 1 },
                        ]}
                    >
                        <MaterialCommunityIcons
                            name="note-plus-outline"
                            size={20}
                            color={theme.foreground}
                        />
                    </Pressable>

                    <Pressable
                        onPress={() => treeRef.current?.promptNewFolder()}
                        hitSlop={8}
                        style={({ pressed }) => [
                            styles.createButton,
                            { opacity: pressed ? 0.6 : 1 },
                        ]}
                    >
                        <MaterialCommunityIcons
                            name="folder-plus-outline"
                            size={20}
                            color={theme.foreground}
                        />
                    </Pressable>
                </View>
            )}

            {/* Viewers get this too: chatting is reading, and the API allows it
             *  for any member. */}
            {mode === "ai" && (
                <View style={styles.createRow}>
                    <Pressable
                        onPress={() => void startChat()}
                        hitSlop={8}
                        style={({ pressed }) => [
                            styles.createButton,
                            { opacity: pressed ? 0.6 : 1 },
                        ]}
                    >
                        <MaterialCommunityIcons
                            name="message-plus-outline"
                            size={20}
                            color={theme.foreground}
                        />
                    </Pressable>
                </View>
            )}

            <WorkspaceBar
                isPopupOpen={isPopupOpen}
                onTogglePopup={() => setIsPopupOpen((open) => !open)}
                onCreateWorkspace={() => navigateTo("/create-workspace")}
                onOpenWorkspace={openWorkspace}
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
        },
        // Centred icon buttons sitting just above the workspace bar, the way
        // Obsidian puts them.
        createRow: {
            flexDirection: "row",
            justifyContent: "center",
            gap: 28,
            paddingVertical: 10,
        },
        createButton: {
            padding: 6,
        },
        centered: {
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
