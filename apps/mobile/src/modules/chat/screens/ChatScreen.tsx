import { useEffect, useRef, useState } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
    ActivityIndicator,
    Keyboard,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets, type EdgeInsets } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import Markdown from "react-native-markdown-display";

import { ApiClientError } from "@/lib/api";
import { useChats } from "@/lib/chat";
import { useNotes } from "@/lib/notes";
import { CONTENT_MAX_WIDTH } from "@/lib/hooks/useLayout";
import { getSocket, joinChat, leaveChat } from "@/lib/socket";
import useTheme from "@/lib/theme/useTheme";
import { fetchChat, sendMessage } from "@/modules/chat/api";
import { createMarkdownStyles } from "@/modules/chat/markdownStyles";
import { ScreenHeader } from "@/modules/drawer";

import type { Theme } from "@cognis/types";
import type { Message } from "../types";

const MAX_MESSAGE_LENGTH = 4000;

type StartedPayload = { chatId: string; messageId: string };
type TokenPayload = { chatId: string; messageId: string; delta: string };
type CompletedPayload = {
    chatId: string;
    messageId: string;
    content: string;
    citedNoteIds: string[];
    truncated: boolean;
};
type ErrorPayload = { chatId: string; messageId: string; message: string };

export default function ChatScreen({ chatId }: { chatId: string }) {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { notes } = useNotes();
    const { chats, isLoading: chatsLoading, refresh: refreshChats } = useChats();

    const styles = createStyles(theme, insets);
    const markdownStyles = createMarkdownStyles(theme);
    const scrollRef = useRef<ScrollView>(null);

    const [title, setTitle] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [draft, setDraft] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [streaming, setStreaming] = useState<{ messageId: string; content: string } | null>(null);
    const [replyError, setReplyError] = useState<string | null>(null);
    const [truncatedIds, setTruncatedIds] = useState<string[]>([]);

    // The window doesn't resize when the keyboard opens, so the thread still
    // lays out to the bottom of the screen - the lower part of it simply sits
    // behind the keyboard, which is where scrollToEnd was parking the newest
    // messages. Shrinking the scroll view by the keyboard's height is what puts
    // its bottom edge back at the composer's top.
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        const shown = Keyboard.addListener("keyboardDidShow", (event) =>
            setKeyboardHeight(event.endCoordinates.height),
        );
        const hidden = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));

        return () => {
            shown.remove();
            hidden.remove();
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        fetchChat(chatId)
            .then((chat) => {
                if (cancelled) return;

                setTitle(chat.title);
                setMessages(chat.messages);
                setIsLoaded(true);
            })
            .catch((err: unknown) => {
                if (cancelled) return;

                setLoadError(
                    err instanceof ApiClientError ? err.message : "Could not open this chat",
                );
            });

        return () => {
            cancelled = true;
        };
    }, [chatId]);

    // Joined on mount rather than at send time: the answer starts streaming the
    // moment the request returns, so a room joined afterwards would miss the
    // opening tokens.
    useEffect(() => {
        let cancelled = false;

        const onStarted = (payload: StartedPayload) => {
            if (payload.chatId !== chatId) return;

            setReplyError(null);
            setStreaming({ messageId: payload.messageId, content: "" });
        };

        const onToken = (payload: TokenPayload) => {
            if (payload.chatId !== chatId) return;

            setStreaming((current) =>
                current && current.messageId === payload.messageId
                    ? { ...current, content: current.content + payload.delta }
                    : current,
            );
        };

        const onCompleted = (payload: CompletedPayload) => {
            if (payload.chatId !== chatId) return;

            setStreaming(null);
            setMessages((current) =>
                current.some((message) => message.id === payload.messageId)
                    ? current
                    : [
                          ...current,
                          {
                              id: payload.messageId,
                              chatId: payload.chatId,
                              role: "assistant",
                              content: payload.content,
                              citedNoteIds: payload.citedNoteIds,
                              createdAt: new Date().toISOString(),
                          },
                      ],
            );

            if (payload.truncated) {
                setTruncatedIds((current) => [...current, payload.messageId]);
            }
        };

        const onError = (payload: ErrorPayload) => {
            if (payload.chatId !== chatId) return;

            setStreaming(null);
            setReplyError(payload.message);
        };

        void joinChat(chatId);

        void getSocket().then((socket) => {
            if (cancelled) return;

            socket.on("chat:message_started", onStarted);
            socket.on("chat:token", onToken);
            socket.on("chat:message_completed", onCompleted);
            socket.on("chat:error", onError);
        });

        return () => {
            cancelled = true;

            void leaveChat(chatId);
            void getSocket().then((socket) => {
                socket.off("chat:message_started", onStarted);
                socket.off("chat:token", onToken);
                socket.off("chat:message_completed", onCompleted);
                socket.off("chat:error", onError);
            });
        };
    }, [chatId]);

    async function send() {
        const question = draft.trim();

        if (!question || isSending || streaming) return;

        setIsSending(true);
        setReplyError(null);
        setDraft("");

        const isFirst = messages.length === 0;

        try {
            const { message } = await sendMessage(chatId, question);

            setMessages((current) => [...current, message]);

            // The opening question names the chat, so the sidebar needs to hear
            // about it.
            if (isFirst) void refreshChats();
        } catch (err) {
            // Put the question back rather than losing it - a refusal here is
            // usually the spend guard, which is worth retrying later.
            setDraft(question);
            setReplyError(
                err instanceof ApiClientError ? err.message : "Could not send that message",
            );
        } finally {
            setIsSending(false);
        }
    }

    function renderCitations(message: Message) {
        if (!message.citedNoteIds?.length) return null;

        return (
            <View style={styles.citations}>
                {message.citedNoteIds.map((noteId) => {
                    const note = notes.find((candidate) => candidate.id === noteId);

                    // A cited note can be deleted after the fact; the message
                    // outlives it by design, so the chip just goes quiet.
                    if (!note) return null;

                    return (
                        <Pressable
                            key={noteId}
                            onPress={() =>
                                router.push({ pathname: "/note/[noteId]", params: { noteId } })
                            }
                            style={({ pressed }) => [styles.chip, { opacity: pressed ? 0.6 : 1 }]}
                        >
                            <MaterialCommunityIcons
                                name="file-outline"
                                size={12}
                                color={theme.primary}
                            />
                            <Text style={styles.chipText} numberOfLines={1}>
                                {note.title}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        );
    }

    // Deleted while open, the same way a note can be - bow out to the empty
    // state rather than sitting on a conversation that no longer exists.
    const stillExists = chats.some((candidate) => candidate.id === chatId);

    if (isLoaded && !chatsLoading && !stillExists) {
        return <Redirect href={{ pathname: "/chat", params: { empty: "1" } }} />;
    }

    if (loadError) {
        return (
            <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
                <ScreenHeader />
                <View style={styles.centered}>
                    <Text style={styles.error}>{loadError}</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!isLoaded) {
        return (
            <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
                <ScreenHeader />
                <View style={styles.centered}>
                    <ActivityIndicator color={theme.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>
            <ScreenHeader title={title} />

            <View style={styles.container}>
                <ScrollView
                    ref={scrollRef}
                    // The margin is the whole fix: it ends the scroll viewport
                    // at the composer's top instead of behind the keyboard.
                    style={[styles.thread, { marginBottom: keyboardHeight }]}
                    contentContainerStyle={styles.threadContent}
                    onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                    keyboardShouldPersistTaps="handled"
                >
                    {messages.length === 0 && !streaming && (
                        <Text style={styles.empty}>
                            Ask anything about the notes in this workspace.
                        </Text>
                    )}

                    {messages.map((message) => (
                        <View
                            key={message.id}
                            style={[
                                styles.bubble,
                                message.role === "user"
                                    ? styles.userBubble
                                    : styles.assistantBubble,
                            ]}
                        >
                            {message.role === "assistant" ? (
                                <Markdown style={markdownStyles}>{message.content}</Markdown>
                            ) : (
                                <Text style={styles.bubbleText}>{message.content}</Text>
                            )}
                            {renderCitations(message)}
                            {truncatedIds.includes(message.id) && (
                                <Text style={styles.truncated}>
                                    Cut off - the answer hit its length limit.
                                </Text>
                            )}
                        </View>
                    ))}

                    {streaming && (
                        <View style={[styles.bubble, styles.assistantBubble]}>
                            {streaming.content ? (
                                // Rendered as it arrives. A half-finished `**`
                                // just shows as literal text until its pair
                                // lands, which reads better than raw markdown.
                                <Markdown style={markdownStyles}>{streaming.content}</Markdown>
                            ) : (
                                <ActivityIndicator color={theme.foreground} size="small" />
                            )}
                        </View>
                    )}

                    {replyError && <Text style={styles.replyError}>{replyError}</Text>}
                </ScrollView>

                {/* Translated up by the keyboard's height, landing flush on top
                 *  of it. Its own safe-area padding is cancelled by the `opened`
                 *  offset, since the keyboard covers that strip. */}
                <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
                    <View style={[styles.composerBar, { paddingBottom: 12 + insets.bottom }]}>
                        <View style={styles.composer}>
                            <TextInput
                                value={draft}
                                onChangeText={setDraft}
                                placeholder="Ask about your notes…"
                                placeholderTextColor={theme.subtleBorder}
                                multiline
                                maxLength={MAX_MESSAGE_LENGTH}
                                style={styles.input}
                            />

                            <Pressable
                                onPress={() => void send()}
                                disabled={!draft.trim() || isSending || streaming !== null}
                                style={({ pressed }) => [
                                    styles.send,
                                    {
                                        opacity:
                                            !draft.trim() || isSending || streaming !== null
                                                ? 0.4
                                                : pressed
                                                  ? 0.85
                                                  : 1,
                                    },
                                ]}
                            >
                                <MaterialCommunityIcons name="send" size={18} color="#ffffff" />
                            </Pressable>
                        </View>
                    </View>
                </KeyboardStickyView>
            </View>
        </SafeAreaView>
    );
}

function createStyles(theme: Theme, insets: EdgeInsets) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.background,
        },
        centered: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
        },
        error: {
            fontSize: 14,
            color: theme.danger,
            textAlign: "center",
        },
        thread: {
            flex: 1,
        },
        threadContent: {
            padding: 16,
            gap: 12,
            // The thread is capped and centred, which also keeps the assistant
            // bubbles' full-width stretch from running the whole of a
            // landscape window.
            width: "100%",
            maxWidth: CONTENT_MAX_WIDTH,
            alignSelf: "center",
        },
        empty: {
            fontSize: 14,
            color: theme.foreground,
            opacity: 0.5,
            textAlign: "center",
            paddingVertical: 32,
        },
        bubble: {
            borderRadius: 14,
            paddingVertical: 10,
            paddingHorizontal: 14,
            gap: 8,
        },
        userBubble: {
            maxWidth: "88%",
            alignSelf: "flex-end",
            backgroundColor: `${theme.primary}26`,
        },
        // Full width rather than hugging its text. A bubble that sizes to its
        // content has no width until its children have been measured, and the
        // markdown renderer puts list text behind a `flex: 1` view whose width
        // isn't known until after that pass - so the text got measured as one
        // unwrapped line, and the citation chips were placed at that height,
        // on top of the lines it actually wrapped to. Stretching gives every
        // element below it a width to wrap against from the start.
        assistantBubble: {
            alignSelf: "stretch",
            backgroundColor: theme.inputBg,
        },
        bubbleText: {
            fontSize: 15,
            lineHeight: 22,
            color: theme.foreground,
        },
        citations: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 6,
        },
        chip: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            maxWidth: 200,
            paddingVertical: 4,
            paddingHorizontal: 8,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: `${theme.primary}80`,
        },
        chipText: {
            fontSize: 12,
            color: theme.primary,
        },
        truncated: {
            fontSize: 12,
            color: theme.foreground,
            opacity: 0.5,
        },
        replyError: {
            fontSize: 13,
            color: theme.danger,
            textAlign: "center",
            paddingVertical: 8,
        },
        // The bar spans the window so its top border and background reach both
        // edges; only the controls inside it are capped and centred, lining up
        // with the thread above.
        composerBar: {
            // paddingBottom is applied at the call site - it depends on whether
            // the keyboard is up.
            borderTopWidth: 1,
            borderTopColor: theme.subtleBorder,
            backgroundColor: theme.background,
        },
        composer: {
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 8,
            paddingHorizontal: 12,
            paddingTop: 12,
            width: "100%",
            maxWidth: CONTENT_MAX_WIDTH,
            alignSelf: "center",
        },
        input: {
            flex: 1,
            maxHeight: 120,
            minHeight: 44,
            borderWidth: 1.5,
            borderColor: theme.subtleBorder,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingTop: 12,
            paddingBottom: 12,
            fontSize: 15,
            color: theme.foreground,
            backgroundColor: theme.inputBg,
        },
        send: {
            // Fixed, deliberately: it holds an icon, not text, so it has no
            // reason to grow. The row is alignItems: "flex-end", so it stays
            // level with the bottom of an input that has grown.
            width: 44,
            height: 44,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.primary,
        },
    });
}
