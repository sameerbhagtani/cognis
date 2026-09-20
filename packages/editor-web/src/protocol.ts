/** Commands the RN host sends into the editor via injectJavaScript. */
export type EditorCommand =
    | "bold"
    | "italic"
    | "strikethrough"
    | "code"
    | "heading"
    | "bulletList"
    | "orderedList"
    | "checklist"
    | "blockquote"
    | "link";

/**
 * Which of the bundled palettes the editor paints with. `@atomic-editor/editor`
 * ships both and opts in to the light one through a `data-theme` attribute on
 * an ancestor of the editor; dark is its default.
 */
export type EditorTheme = "light" | "dark";

/** Events the editor sends back to the RN host via postMessage. */
export type EditorEvent =
    | { type: "ready" }
    | { type: "change"; payload: { content: string } }
    | { type: "getContentResult"; payload: { messageId: string; content: string } }
    | { type: "linkClick"; payload: { url: string } };
