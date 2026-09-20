import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useLocalSearchParams } from "expo-router";

import { useNotes } from "@/lib/notes";
import useTheme from "@/lib/theme/useTheme";
import { useWorkspace } from "@/lib/workspace";
import { ScreenHeader } from "@/modules/drawer";

import type { Theme } from "@cognis/types";

/**
 * Notes mode's landing spot. There's no note id in hand here, so it sends you to
 * the one you touched last - a Redirect rather than navigating from an effect,
 * so there's no render-then-bounce.
 *
 * `empty=1` suppresses that: it's how the editor bows out after the open note is
 * deleted, where jumping straight into an unrelated note would feel like a bug.
 */
export default function NotesHome() {
    const { theme } = useTheme();
    const { activeWorkspace } = useWorkspace();
    const { notes, isLoading } = useNotes();
    const { empty } = useLocalSearchParams<{ empty?: string }>();

    const styles = createStyles(theme);

    const mostRecent = notes.reduce<(typeof notes)[number] | null>(
        (latest, note) => (latest === null || note.updatedAt > latest.updatedAt ? note : latest),
        null,
    );

    if (mostRecent && empty !== "1") {
        return (
            <Redirect href={{ pathname: "/note/[noteId]", params: { noteId: mostRecent.id } }} />
        );
    }

    const canWrite = activeWorkspace?.role === "owner" || activeWorkspace?.role === "editor";
    const hasNotes = notes.length > 0;

    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            <ScreenHeader />

            <View style={styles.centered}>
                {isLoading ? (
                    <ActivityIndicator color={theme.primary} />
                ) : (
                    <Text style={styles.empty}>
                        {hasNotes
                            ? "Pick a note from the sidebar."
                            : canWrite
                              ? "No notes in this workspace yet. Open the sidebar to create one."
                              : "No notes in this workspace yet."}
                    </Text>
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
        },
        empty: {
            fontSize: 14,
            color: theme.foreground,
            opacity: 0.5,
            textAlign: "center",
        },
    });
}
