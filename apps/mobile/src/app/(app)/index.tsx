import { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import useTheme from "@/lib/theme/useTheme";
import { CognisEditor, EditorToolbar, type CognisEditorHandle } from "@/modules/editor";
import { handleSignout } from "@/modules/auth/api";

import type { EditorCommand } from "@cognis/editor-web/protocol";

// Phase 3 spike content — proves the WebView/CodeMirror bridge end to end
// before any note is wired up to a real workspace.
const SPIKE_CONTENT = `# Cognis editor spike

Type on **this line** to see it turn into raw markdown, then move the cursor
to another line to see it *render* instead.

- a bullet
- another bullet

> a quote

\`inline code\` too.
`;

export default function Index() {
    const { theme } = useTheme();
    const editorRef = useRef<CognisEditorHandle>(null);
    const [readOnly, setReadOnly] = useState(false);
    const insets = useSafeAreaInsets();

    function handleCommand(command: EditorCommand) {
        editorRef.current?.exec(command);
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>
                <StatusBar style="auto" />
                <View style={styles.header}>
                    {/* Temporary — belongs in Settings once that screen exists. Here
                     *  purely so auth flows are testable without clearing app data. */}
                    <Pressable onPress={() => handleSignout()} hitSlop={8}>
                        <MaterialCommunityIcons name="logout" size={22} color={theme.foreground} />
                    </Pressable>
                    <Pressable onPress={() => setReadOnly((prev) => !prev)} hitSlop={8}>
                        <MaterialCommunityIcons
                            name={readOnly ? "pencil-outline" : "book-open-variant"}
                            size={22}
                            color={theme.foreground}
                        />
                    </Pressable>
                </View>
                <CognisEditor
                    ref={editorRef}
                    initialContent={SPIKE_CONTENT}
                    readOnly={readOnly}
                    onChange={(content) => console.log("editor changed, length", content.length)}
                    onLinkPress={(url) => console.log("link pressed", url)}
                />
            </SafeAreaView>
            {/* Sits outside the SafeAreaView on purpose: SafeAreaView's own bottom
             *  padding would double up with the keyboard-open offset below, since
             *  KeyboardStickyView translates from its *resting* position — which
             *  would already be inset.bottom above the true edge — by the
             *  keyboard's height. The gap between the toolbar and the keyboard was
             *  exactly that double-counted inset. Passing it through `offset`
             *  instead keeps it only for the keyboard-closed state, where it's
             *  still needed to clear the home indicator. */}
            {!readOnly && (
                <KeyboardStickyView offset={{ closed: insets.bottom, opened: 0 }}>
                    <EditorToolbar onCommand={handleCommand} />
                </KeyboardStickyView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
});
