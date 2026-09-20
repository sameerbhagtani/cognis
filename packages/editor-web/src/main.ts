import { Annotation, Compartment, EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { GFM } from "@lezer/markdown";
import {
    atomicEditorTheme,
    atomicMarkdownSyntax,
    autoCloseCodeFence,
    extendEmphasisPair,
    inlinePreview,
    readOnlyExtension,
    startAsteriskList,
} from "@atomic-editor/editor";
import "@atomic-editor/editor/styles.css";

import { runCommand } from "./commands";

import type { EditorCommand, EditorEvent, EditorTheme } from "./protocol";

declare global {
    interface Window {
        ReactNativeWebView?: { postMessage: (message: string) => void };
        cognisEditor: {
            setContent: (content: string) => void;
            getContent: (messageId: string) => void;
            setReadOnly: (readOnly: boolean) => void;
            setTheme: (theme: EditorTheme) => void;
            exec: (command: EditorCommand) => void;
            blur: () => void;
        };
        /** Written by the host before this document's scripts run, so the first
         *  paint already uses the right palette. See index.html. */
        __cognisTheme?: EditorTheme;
    }
}

function post(event: EditorEvent) {
    window.ReactNativeWebView?.postMessage(JSON.stringify(event));
}

const readOnlyCompartment = new Compartment();

/**
 * Marks a transaction as one we applied ourselves - loading a note, or
 * reloading it - so the change listener can tell it apart from typing. Without
 * this, opening a note immediately reports a "change" back to the host, which
 * autosaves the note's own content straight back to the server.
 */
const programmatic = Annotation.define<boolean>();

const mount = document.getElementById("editor");
if (!mount) throw new Error("missing #editor mount node");

const view = new EditorView({
    parent: mount,
    state: EditorState.create({
        doc: "",
        extensions: [
            history(),
            keymap.of([...defaultKeymap, ...historyKeymap]),
            markdown({ extensions: GFM }),
            inlinePreview({ onLinkClick: (url) => post({ type: "linkClick", payload: { url } }) }),
            atomicEditorTheme,
            atomicMarkdownSyntax,
            autoCloseCodeFence,
            extendEmphasisPair,
            startAsteriskList,
            readOnlyCompartment.of(readOnlyExtension(false)),
            EditorView.lineWrapping,
            EditorView.updateListener.of((update) => {
                if (!update.docChanged) return;
                if (update.transactions.some((tr) => tr.annotation(programmatic))) return;

                post({ type: "change", payload: { content: update.state.doc.toString() } });
            }),
        ],
    }),
});

window.cognisEditor = {
    setContent(content) {
        view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: content },
            annotations: programmatic.of(true),
        });
    },
    getContent(messageId) {
        post({
            type: "getContentResult",
            payload: { messageId, content: view.state.doc.toString() },
        });
    },
    setReadOnly(readOnly) {
        view.dispatch({ effects: readOnlyCompartment.reconfigure(readOnlyExtension(readOnly)) });
    },
    // The package's light palette is opt-in: it re-maps every
    // `--atomic-editor-*` variable under `[data-theme="light"]`, and its dark
    // values are the plain defaults. So switching themes is one attribute,
    // not a CodeMirror reconfigure.
    setTheme(theme) {
        document.documentElement.dataset.theme = theme;
    },
    exec(command) {
        runCommand(view, command);
    },
    // Dropping focus is what dismisses Android's selection handle - that
    // floating "waterdrop" under the caret is a native popup window, so it
    // draws over the drawer rather than under it while the editor stays
    // focused. Hiding the RN keyboard alone doesn't clear it.
    blur() {
        view.contentDOM.blur();
    },
};

post({ type: "ready" });
