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

/** Events the editor sends back to the RN host via postMessage. */
export type EditorEvent =
    | { type: "ready" }
    | { type: "change"; payload: { content: string } }
    | { type: "getContentResult"; payload: { messageId: string; content: string } }
    | { type: "linkClick"; payload: { url: string } };
