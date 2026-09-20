import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useTheme from "@/lib/theme/useTheme";
import {
    RichText,
    Toolbar,
    useEditorBridge,
    darkEditorTheme,
    CoreBridge,
    darkEditorCss,
    PlaceholderBridge,
    TenTapStartKit,
} from "@10play/tentap-editor";

export function CongnisEditor() {
    const { theme } = useTheme();

    const editor = useEditorBridge({
        autofocus: true,
        initialContent: "",
        bridgeExtensions: [
            ...TenTapStartKit,
            PlaceholderBridge.configureExtension({
                placeholder: "Type something...",
            }),
        ],
    });

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <RichText editor={editor} />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.editorKeyboardAvoidingView}
            >
                <Toolbar editor={editor} />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginLeft: 10,
    },
    editor: {
        flex: 1,
        fontSize: 16,
        padding: 16,
        textAlignVertical: "top",
    },
    editorKeyboardAvoidingView: {
        position: "absolute",
        width: "100%",
        bottom: 0,
    },
});
