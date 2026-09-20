import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";

import { ApiClientError } from "@/lib/api";
import { useChats } from "@/lib/chat";
import useTheme from "@/lib/theme/useTheme";
import { useWorkspace } from "@/lib/workspace";
import { createChat } from "@/modules/chat/api";
import { ScreenHeader } from "@/modules/drawer";

import type { Theme } from "@cognis/types";

/**
 * AI mode's landing spot, mirroring the notes side: straight into the most
 * recent conversation, unless `empty=1` says otherwise - which is how the chat
 * screen bows out after its conversation is deleted.
 */
export default function ChatHome() {
    const { theme } = useTheme();
    const router = useRouter();
    const { activeWorkspace } = useWorkspace();
    const { chats, isLoading, refresh } = useChats();
    const { empty } = useLocalSearchParams<{ empty?: string }>();

    const styles = createStyles(theme);

    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // The list arrives newest-activity-first, so the head is the latest.
    const mostRecent = chats[0] ?? null;

    if (mostRecent && empty !== "1") {
        return (
            <Redirect href={{ pathname: "/chat/[chatId]", params: { chatId: mostRecent.id } }} />
        );
    }

    async function startChat() {
        if (!activeWorkspace || isCreating) return;

        setIsCreating(true);
        setError(null);

        try {
            const chat = await createChat(activeWorkspace.id);

            await refresh();
            router.replace({ pathname: "/chat/[chatId]", params: { chatId: chat.id } });
        } catch (err) {
            setError(err instanceof ApiClientError ? err.message : "Could not start a chat");
        } finally {
            setIsCreating(false);
        }
    }

    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            <ScreenHeader title="AI" />

            <View style={styles.centered}>
                {isLoading ? (
                    <ActivityIndicator color={theme.primary} />
                ) : (
                    <>
                        <Text style={styles.text}>
                            Ask questions about the notes in this workspace. Answers come from your
                            notes alone, and say which ones they used.
                        </Text>

                        {error && <Text style={styles.error}>{error}</Text>}

                        <Pressable
                            onPress={() => void startChat()}
                            disabled={isCreating}
                            style={({ pressed }) => [
                                styles.button,
                                { opacity: isCreating ? 0.5 : pressed ? 0.85 : 1 },
                            ]}
                        >
                            {isCreating ? (
                                <ActivityIndicator color="#ffffff" size="small" />
                            ) : (
                                <Text style={styles.buttonText}>New chat</Text>
                            )}
                        </Pressable>
                    </>
                )}
            </View>
        </SafeAreaView>
    );
}

function createStyles(theme: Theme) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.background,
        },
        centered: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            gap: 16,
        },
        text: {
            fontSize: 14,
            color: theme.foreground,
            opacity: 0.6,
            textAlign: "center",
            lineHeight: 20,
        },
        error: {
            fontSize: 13,
            color: theme.danger,
            textAlign: "center",
        },
        button: {
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 12,
            backgroundColor: theme.primary,
        },
        buttonText: {
            fontSize: 15,
            fontWeight: "700",
            color: "#ffffff",
        },
    });
}
