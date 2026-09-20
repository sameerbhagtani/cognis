import { useState } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useChats } from "@/lib/chat";
import useTheme from "@/lib/theme/useTheme";
import { deleteChat } from "@/modules/chat/api";
import { ActionSheet } from "./ActionSheet";

import type { Theme } from "@cognis/types";
import type { Chat } from "@/modules/chat/types";

type ChatListProps = {
    onOpenChat: (chatId: string) => void;
};

export function ChatList({ onOpenChat }: ChatListProps) {
    const { theme } = useTheme();
    const { chats, isLoading, error, refresh } = useChats();

    const styles = createStyles(theme);
    const [menuFor, setMenuFor] = useState<Chat | null>(null);

    async function remove(chat: Chat) {
        await deleteChat(chat.id);
        await refresh();
    }

    if (isLoading) return <Text style={styles.status}>Loading…</Text>;

    if (error) {
        return (
            <View style={styles.statusBlock}>
                <Text style={styles.error}>{error}</Text>
                <Text style={styles.retry} onPress={() => void refresh()}>
                    Try again
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                {chats.length === 0 ? (
                    <Text style={styles.status}>No chats yet. Start one below.</Text>
                ) : (
                    chats.map((chat) => (
                        <Pressable
                            key={chat.id}
                            onPress={() => onOpenChat(chat.id)}
                            onLongPress={() => setMenuFor(chat)}
                            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
                        >
                            <MaterialCommunityIcons
                                name="message-outline"
                                size={16}
                                color={theme.foreground}
                            />
                            <Text style={styles.rowText} numberOfLines={1}>
                                {chat.title}
                            </Text>
                        </Pressable>
                    ))
                )}
            </ScrollView>

            <ActionSheet
                visible={menuFor !== null}
                title={menuFor?.title ?? ""}
                actions={
                    menuFor
                        ? [
                              {
                                  label: "Delete chat",
                                  icon: "trash-can-outline",
                                  destructive: true,
                                  onPress: () => void remove(menuFor),
                              },
                          ]
                        : []
                }
                onClose={() => setMenuFor(null)}
            />
        </View>
    );
}

function createStyles(theme: Theme) {
    return StyleSheet.create({
        container: {
            flex: 1,
        },
        list: {
            flex: 1,
        },
        listContent: {
            paddingBottom: 12,
        },
        row: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingVertical: 10,
            paddingHorizontal: 12,
        },
        rowText: {
            flex: 1,
            fontSize: 14,
            color: theme.foreground,
        },
        status: {
            fontSize: 13,
            color: theme.foreground,
            opacity: 0.5,
            textAlign: "center",
            paddingHorizontal: 24,
            paddingVertical: 16,
        },
        statusBlock: {
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 24,
            paddingVertical: 16,
        },
        error: {
            fontSize: 13,
            color: theme.danger,
            textAlign: "center",
        },
        retry: {
            fontSize: 13,
            fontWeight: "600",
            color: theme.primary,
        },
    });
}
