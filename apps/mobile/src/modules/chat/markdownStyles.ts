import { StyleSheet } from "react-native";

import type { Theme } from "@cognis/types";

/**
 * Styling for assistant answers, which come back as markdown. Keys are the
 * renderer's own element names rather than ours.
 *
 * Sized to sit inside a chat bubble: headings only a little larger than body
 * text, and no top margin on the first block, since the bubble supplies the
 * padding.
 */
export function createMarkdownStyles(theme: Theme) {
    return StyleSheet.create({
        body: {
            fontSize: 15,
            lineHeight: 22,
            color: theme.foreground,
        },
        paragraph: {
            marginTop: 0,
            marginBottom: 8,
        },
        heading1: {
            fontSize: 18,
            fontWeight: "700",
            color: theme.foreground,
            marginBottom: 6,
        },
        heading2: {
            fontSize: 17,
            fontWeight: "700",
            color: theme.foreground,
            marginBottom: 6,
        },
        heading3: {
            fontSize: 16,
            fontWeight: "600",
            color: theme.foreground,
            marginBottom: 4,
        },
        strong: {
            fontWeight: "700",
        },
        em: {
            fontStyle: "italic",
        },
        s: {
            textDecorationLine: "line-through",
        },
        link: {
            color: theme.primary,
            textDecorationLine: "underline",
        },
        bullet_list: {
            marginBottom: 8,
        },
        ordered_list: {
            marginBottom: 8,
        },
        list_item: {
            flexDirection: "row",
            justifyContent: "flex-start",
        },
        // Inline code is a nested <Text>, so its padding and border are drawn
        // but not measured: the paragraph reports a height that doesn't include
        // them and the next sibling gets laid out over the text. The renderer
        // merges each override onto its default key by key, so the default's
        // `padding: 10` and `borderWidth: 1` have to be cleared by name -
        // leaving them out isn't enough. lineHeight matches the body's so the
        // span sits in the same line box as the text around it.
        code_inline: {
            fontFamily: "monospace",
            fontSize: 14,
            lineHeight: 22,
            color: theme.foreground,
            backgroundColor: `${theme.foreground}14`,
            borderWidth: 0,
            borderRadius: 4,
            padding: 0,
        },
        fence: {
            fontFamily: "monospace",
            fontSize: 13,
            color: theme.foreground,
            backgroundColor: `${theme.foreground}14`,
            borderWidth: 0,
            borderRadius: 8,
            padding: 10,
            marginBottom: 8,
        },
        code_block: {
            fontFamily: "monospace",
            fontSize: 13,
            color: theme.foreground,
            backgroundColor: `${theme.foreground}14`,
            borderWidth: 0,
            borderRadius: 8,
            padding: 10,
            marginBottom: 8,
        },
        blockquote: {
            backgroundColor: "transparent",
            borderLeftWidth: 3,
            borderLeftColor: `${theme.primary}80`,
            marginLeft: 0,
            paddingLeft: 10,
            marginBottom: 8,
        },
        hr: {
            backgroundColor: theme.subtleBorder,
            height: 1,
            marginVertical: 8,
        },
        table: {
            borderColor: theme.subtleBorder,
            borderRadius: 6,
            marginBottom: 8,
        },
        th: {
            padding: 6,
        },
        td: {
            padding: 6,
            borderColor: theme.subtleBorder,
        },
    });
}
