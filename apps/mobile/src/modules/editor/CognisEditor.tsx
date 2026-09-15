import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useTheme from "@/lib/theme/useTheme";
import { RichText, Toolbar, useEditorBridge } from "@10play/tentap-editor";

export function CongnisEditor() {
    const { theme } = useTheme();
    const [content, setContent] = useState("");

    const editor = useEditorBridge({
        autofocus: true,
        avoidIosKeyboard: true,
        initialContent: "Start editing!",
    });

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <RichText editor={editor} />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{
                    position: "absolute",
                    width: "100%",
                    bottom: 0,
                }}
            >
                <Toolbar editor={editor} />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    editor: {
        flex: 1,
        fontSize: 16,
        padding: 16,
        textAlignVertical: "top",
    },
});
