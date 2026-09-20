import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { editorHtml } from "@cognis/editor-web";
import type { EditorCommand, EditorEvent } from "@cognis/editor-web/protocol";

export type CognisEditorHandle = {
    exec: (command: EditorCommand) => void;
    getContent: () => Promise<string>;
    /** Drops focus inside the WebView - also what clears Android's selection handle. */
    blur: () => void;
};

type CognisEditorProps = {
    /** Read once, when the bridge signals ready. A different note is a different
     *  component instance (key it by note id), not a prop update. */
    initialContent: string;
    readOnly?: boolean;
    onChange?: (content: string) => void;
    onLinkPress?: (url: string) => void;
};

function randomMessageId() {
    return Math.random().toString(36).slice(2);
}

export const CognisEditor = forwardRef<CognisEditorHandle, CognisEditorProps>(function CognisEditor(
    { initialContent, readOnly = false, onChange, onLinkPress },
    ref,
) {
    const webviewRef = useRef<WebView>(null);
    const pendingGets = useRef(new Map<string, (content: string) => void>());
    const initialContentRef = useRef(initialContent);
    const [ready, setReady] = useState(false);

    function runJs(script: string) {
        webviewRef.current?.injectJavaScript(`${script}; true;`);
    }

    useEffect(() => {
        if (ready)
            runJs(`window.cognisEditor.setContent(${JSON.stringify(initialContentRef.current)})`);
    }, [ready]);

    useEffect(() => {
        if (ready) runJs(`window.cognisEditor.setReadOnly(${JSON.stringify(readOnly)})`);
    }, [ready, readOnly]);

    useImperativeHandle(ref, () => ({
        exec(command) {
            runJs(`window.cognisEditor.exec(${JSON.stringify(command)})`);
        },
        getContent() {
            return new Promise((resolve) => {
                const messageId = randomMessageId();
                pendingGets.current.set(messageId, resolve);
                runJs(`window.cognisEditor.getContent(${JSON.stringify(messageId)})`);
            });
        },
        blur() {
            runJs("window.cognisEditor.blur()");
        },
    }));

    function handleMessage(event: WebViewMessageEvent) {
        const message: EditorEvent = JSON.parse(event.nativeEvent.data);

        switch (message.type) {
            case "ready":
                setReady(true);
                return;
            case "change":
                onChange?.(message.payload.content);
                return;
            case "getContentResult": {
                const resolve = pendingGets.current.get(message.payload.messageId);
                resolve?.(message.payload.content);
                pendingGets.current.delete(message.payload.messageId);
                return;
            }
            case "linkClick":
                onLinkPress?.(message.payload.url);
                return;
        }
    }

    return (
        <WebView
            ref={webviewRef}
            source={{ html: editorHtml }}
            onMessage={handleMessage}
            style={styles.webview}
            keyboardDisplayRequiresUserAction={false}
            hideKeyboardAccessoryView
        />
    );
});

const styles = StyleSheet.create({
    webview: {
        flex: 1,
        backgroundColor: "transparent",
    },
});
