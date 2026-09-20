import { useCallback, useEffect, useRef, useState } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
    ActivityIndicator,
    Keyboard,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Redirect } from "expo-router";
import { useDrawerStatus } from "expo-router/drawer";
import { KeyboardStickyView } from "react-native-keyboard-controller";

import { ApiClientError } from "@/lib/api";
import { useDebouncedCallback } from "@/lib/hooks/useDebouncedCallback";
import { CONTENT_MAX_WIDTH } from "@/lib/hooks/useLayout";
import { useNotes } from "@/lib/notes";
import { getSocket } from "@/lib/socket";
import useTheme from "@/lib/theme/useTheme";
import { useWorkspace } from "@/lib/workspace";
import { fetchNote, updateNote } from "@/modules/note/api";
import { ScreenHeader } from "@/modules/drawer";
import { CognisEditor, EditorToolbar, type CognisEditorHandle } from "@/modules/editor";

import type { Theme } from "@cognis/types";
import type { EditorCommand } from "@cognis/editor-web/protocol";
import type { Note } from "@/modules/note/types";

const CONTENT_SAVE_DELAY_MS = 1500;
const TITLE_SAVE_DELAY_MS = 800;

type SaveState = "idle" | "saving" | "saved" | "error";

type NoteUpdatedPayload = {
    id: string;
    title: string;
    folderId: string | null;
    updatedAt: string;
};

export default function NoteEditor({ noteId }: { noteId: string }) {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const drawerStatus = useDrawerStatus();
    const { activeWorkspace } = useWorkspace();
    const { notes, isLoading: notesLoading, applyNotePatch } = useNotes();

    const styles = createStyles(theme);
    const editorRef = useRef<CognisEditorHandle>(null);

    const canWrite = activeWorkspace?.role === "owner" || activeWorkspace?.role === "editor";

    const [note, setNote] = useState<Note | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [saveState, setSaveState] = useState<SaveState>("idle");
    const [readOnly, setReadOnly] = useState(!canWrite);
    const [changedElsewhere, setChangedElsewhere] = useState(false);
    // Bumped to remount the editor, which is how a reload replaces its content -
    // initialContent is deliberately read once.
    const [reloadKey, setReloadKey] = useState(0);

    // The updatedAt of the newest revision we know about - our own saves, and
    // any external change we've already taken on board. A note:updated carrying
    // this exact value is an echo of something we've already applied.
    const ownUpdatedAtRef = useRef<string | null>(null);

    // Read inside the socket callback, which is subscribed once per note and
    // would otherwise close over a stale title.
    const titleRef = useRef(title);
    useEffect(() => {
        titleRef.current = title;
    });

    // True between the user typing in the title field and that edit being saved,
    // so an incoming rename can't yank the text out from under them mid-word.
    const titleDirtyRef = useRef(false);

    // How many of our own saves are in flight. The server emits note:updated the
    // moment it writes, and that travels a live socket while our PATCH response
    // is still coming back over HTTP - so the echo of our own save routinely
    // arrives *before* we learn its updatedAt. Counting in-flight saves is what
    // stops that racing echo being mistaken for somebody else's edit.
    const savesInFlightRef = useRef(0);

    const load = useCallback(async () => {
        try {
            const fetched = await fetchNote(noteId);

            setNote(fetched);
            setTitle(fetched.title);
            ownUpdatedAtRef.current = fetched.updatedAt;
            setLoadError(null);
            setChangedElsewhere(false);
        } catch (err) {
            setLoadError(err instanceof ApiClientError ? err.message : "Could not open this note");
        }
    }, [noteId]);

    useEffect(() => {
        let cancelled = false;

        fetchNote(noteId)
            .then((fetched) => {
                if (cancelled) return;

                setNote(fetched);
                setTitle(fetched.title);
                ownUpdatedAtRef.current = fetched.updatedAt;
            })
            .catch((err: unknown) => {
                if (cancelled) return;

                setLoadError(
                    err instanceof ApiClientError ? err.message : "Could not open this note",
                );
            });

        return () => {
            cancelled = true;
        };
    }, [noteId]);

    const save = useCallback(
        async (changes: { title?: string; content?: string }) => {
            setSaveState("saving");
            savesInFlightRef.current += 1;

            try {
                const updated = await updateNote(noteId, changes);

                ownUpdatedAtRef.current = updated.updatedAt;
                if (changes.title !== undefined) titleDirtyRef.current = false;

                applyNotePatch(noteId, { title: updated.title, updatedAt: updated.updatedAt });
                setSaveState("saved");
            } catch {
                setSaveState("error");
            } finally {
                savesInFlightRef.current -= 1;
            }
        },
        [noteId, applyNotePatch],
    );

    const { schedule: scheduleContentSave, flush: flushContentSave } = useDebouncedCallback(
        (content: string) => void save({ content }),
        CONTENT_SAVE_DELAY_MS,
    );

    const { schedule: scheduleTitleSave, flush: flushTitleSave } = useDebouncedCallback(
        (nextTitle: string) => void save({ title: nextTitle }),
        TITLE_SAVE_DELAY_MS,
    );

    // Nothing in flight should be lost on the way out.
    useEffect(
        () => () => {
            flushContentSave();
            flushTitleSave();
        },
        [flushContentSave, flushTitleSave],
    );

    // Someone else editing the same note. The banner is as far as this goes -
    // the backend is last-write-wins by design, and silently replacing what
    // someone is mid-sentence on would be worse than telling them.
    useEffect(() => {
        let cancelled = false;

        const onNoteUpdated = (payload: NoteUpdatedPayload) => {
            if (payload.id !== noteId) return;
            if (payload.updatedAt === ownUpdatedAtRef.current) return;
            // Our own write, echoing back before its response arrived.
            if (savesInFlightRef.current > 0) return;

            // A rename - most often from this very sidebar, since the event
            // comes back to the originating client too. There's nothing to
            // reconcile for a title, so take it rather than warn about it.
            if (payload.title !== titleRef.current) {
                ownUpdatedAtRef.current = payload.updatedAt;

                if (!titleDirtyRef.current) setTitle(payload.title);
                return;
            }

            setChangedElsewhere(true);
        };

        void getSocket().then((socket) => {
            if (cancelled) return;

            socket.on("note:updated", onNoteUpdated);
        });

        return () => {
            cancelled = true;
            void getSocket().then((socket) => socket.off("note:updated", onNoteUpdated));
        };
    }, [noteId]);

    // Same as the spike screen: the drawer opening over a focused editor has to
    // clear both the keyboard and Android's selection handle.
    useEffect(() => {
        if (drawerStatus === "open") {
            Keyboard.dismiss();
            editorRef.current?.blur();
        }
    }, [drawerStatus]);

    function onChangeTitle(next: string) {
        setTitle(next);
        titleDirtyRef.current = true;

        if (next.trim().length > 0) scheduleTitleSave(next.trim());
    }

    async function reload() {
        await load();
        setReloadKey((key) => key + 1);
    }

    // Trashed while open - by this device or another. Checked against the
    // workspace's note list rather than a note:deleted event, because deleting a
    // folder takes its notes down with it and only announces the folder: the
    // note simply stops being in the list either way.
    const stillExists = notes.some((candidate) => candidate.id === noteId);

    if (note && !notesLoading && !stillExists) {
        // Lands on the empty state rather than the most recent note: being
        // teleported into an unrelated note right after deleting one reads as
        // a glitch. Tapping "Notes" in the sidebar still opens the latest.
        return <Redirect href={{ pathname: "/", params: { empty: "1" } }} />;
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

    if (!note) {
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
        <View style={styles.container}>
            <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>
                <ScreenHeader
                    action={
                        canWrite ? (
                            <Pressable onPress={() => setReadOnly((prev) => !prev)} hitSlop={8}>
                                <MaterialCommunityIcons
                                    name={readOnly ? "pencil-outline" : "book-open-variant"}
                                    size={22}
                                    color={theme.foreground}
                                />
                            </Pressable>
                        ) : null
                    }
                />

                {/* Title, banner and editor share one cap so they stay aligned
                 *  with each other when a landscape window is wider than the
                 *  column of text we actually want. */}
                <View style={styles.body}>
                    <View style={styles.titleRow}>
                        <TextInput
                            value={title}
                            onChangeText={onChangeTitle}
                            onBlur={flushTitleSave}
                            editable={canWrite && !readOnly}
                            placeholder="Untitled"
                            placeholderTextColor={theme.subtleBorder}
                            maxLength={50}
                            style={styles.title}
                        />
                        <Text style={styles.saveState}>
                            {saveState === "saving"
                                ? "Saving…"
                                : saveState === "saved"
                                  ? "Saved"
                                  : saveState === "error"
                                    ? "Not saved"
                                    : ""}
                        </Text>
                    </View>

                    {changedElsewhere && (
                        <Pressable style={styles.banner} onPress={() => void reload()}>
                            <Text style={styles.bannerText}>
                                This note changed elsewhere. Tap to reload.
                            </Text>
                        </Pressable>
                    )}

                    <CognisEditor
                        // A different note, or a reload of this one, is a
                        // different instance: initialContent is read once by
                        // design.
                        key={`${note.id}:${reloadKey}`}
                        ref={editorRef}
                        initialContent={note.content ?? ""}
                        readOnly={readOnly}
                        onChange={scheduleContentSave}
                    />
                </View>
            </SafeAreaView>

            {/* `offset` is a translateY, not padding: a positive `closed` value
             *  pushes the bar *down* off the screen. So the toolbar carries the
             *  safe-area inset as its own padding, and `opened` cancels that
             *  padding once the keyboard is covering that strip - which is what
             *  keeps it flush against the keyboard with no gap. */}
            {!readOnly && canWrite && (
                <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
                    <EditorToolbar
                        onCommand={(command: EditorCommand) => editorRef.current?.exec(command)}
                    />
                </KeyboardStickyView>
            )}
        </View>
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
            padding: 24,
        },
        error: {
            fontSize: 14,
            color: theme.danger,
            textAlign: "center",
        },
        body: {
            flex: 1,
            width: "100%",
            maxWidth: CONTENT_MAX_WIDTH,
            alignSelf: "center",
        },
        titleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 16,
            paddingBottom: 8,
        },
        title: {
            flex: 1,
            // Larger than the editor's own h1 (1.35em of ~17px), so the note's
            // title still reads as the thing above every heading inside it.
            fontSize: 26,
            fontWeight: "700",
            color: theme.foreground,
            paddingVertical: 4,
            // Cancels the TextInput's built-in horizontal padding on Android, so
            // the title starts exactly where the editor's first character does.
            paddingHorizontal: 0,
        },
        saveState: {
            fontSize: 12,
            color: theme.foreground,
            opacity: 0.45,
        },
        banner: {
            marginHorizontal: 16,
            marginBottom: 8,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 10,
            backgroundColor: `${theme.primary}1a`,
            borderWidth: 1,
            borderColor: `${theme.primary}80`,
        },
        bannerText: {
            fontSize: 13,
            color: theme.primary,
            textAlign: "center",
        },
    });
}
