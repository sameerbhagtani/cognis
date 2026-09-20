import { EditorSelection, type EditorState } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";

import type { EditorCommand } from "./protocol";

/** Wraps the selection in a marker, or drops it back in empty to type into. */
function wrapSelection(view: EditorView, marker: string) {
    const changes = view.state.changeByRange((range) => {
        if (range.empty) {
            return {
                changes: [{ from: range.from, insert: marker + marker }],
                range: EditorSelection.cursor(range.from + marker.length),
            };
        }

        return {
            changes: [
                { from: range.from, insert: marker },
                { from: range.to, insert: marker },
            ],
            range: EditorSelection.range(range.from + marker.length, range.to + marker.length),
        };
    });

    view.dispatch(view.state.update(changes, { scrollIntoView: true }));
    view.focus();
}

/** Toggles a line prefix (list markers, blockquote) on every line the selection touches. */
function toggleLinePrefix(view: EditorView, prefix: string) {
    const changes = view.state.changeByRange((range) => {
        const line = view.state.doc.lineAt(range.from);
        const hasPrefix = line.text.startsWith(prefix);

        const change = hasPrefix
            ? { from: line.from, to: line.from + prefix.length, insert: "" }
            : { from: line.from, insert: prefix };
        const delta = hasPrefix ? -prefix.length : prefix.length;

        return {
            changes: [change],
            range: EditorSelection.range(
                Math.max(line.from, range.from + delta),
                Math.max(line.from, range.to + delta),
            ),
        };
    });

    view.dispatch(view.state.update(changes, { scrollIntoView: true }));
    view.focus();
}

/** Cycles the current line's heading level: paragraph -> H1 -> H2 -> H3 -> paragraph. */
function cycleHeading(view: EditorView, state: EditorState) {
    const range = view.state.selection.main;
    const line = view.state.doc.lineAt(range.from);
    const match = /^(#{1,3}) /.exec(line.text);
    const level = match ? match[1].length : 0;

    const nextPrefix = level >= 3 ? "" : "#".repeat(level + 1) + " ";
    const from = line.from;
    const to = line.from + (match ? match[0].length : 0);
    const delta = nextPrefix.length - (to - from);

    view.dispatch(
        state.update({
            changes: [{ from, to, insert: nextPrefix }],
            selection: EditorSelection.range(
                Math.max(from, range.from + delta),
                Math.max(from, range.to + delta),
            ),
            scrollIntoView: true,
        }),
    );
    view.focus();
}

/** Inserts a link template around the selection, ready to type the URL into. */
function insertLink(view: EditorView) {
    const range = view.state.selection.main;
    const text = view.state.sliceDoc(range.from, range.to) || "link text";
    const insert = `[${text}](url)`;

    view.dispatch(
        view.state.update({
            changes: [{ from: range.from, to: range.to, insert }],
            selection: EditorSelection.range(
                range.from + text.length + 3,
                range.from + text.length + 6,
            ),
            scrollIntoView: true,
        }),
    );
    view.focus();
}

export function runCommand(view: EditorView, command: EditorCommand) {
    switch (command) {
        case "bold":
            return wrapSelection(view, "**");
        case "italic":
            return wrapSelection(view, "_");
        case "strikethrough":
            return wrapSelection(view, "~~");
        case "code":
            return wrapSelection(view, "`");
        case "heading":
            return cycleHeading(view, view.state);
        case "bulletList":
            return toggleLinePrefix(view, "- ");
        case "orderedList":
            return toggleLinePrefix(view, "1. ");
        case "checklist":
            return toggleLinePrefix(view, "- [ ] ");
        case "blockquote":
            return toggleLinePrefix(view, "> ");
        case "link":
            return insertLink(view);
    }
}
