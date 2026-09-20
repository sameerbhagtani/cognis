import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets, type EdgeInsets } from "react-native-safe-area-context";

import useTheme from "@/lib/theme/useTheme";

import type { EditorCommand } from "@cognis/editor-web/protocol";
import type { Theme } from "@cognis/types";

type ToolbarButton = {
    command: EditorCommand;
    icon: keyof (typeof MaterialCommunityIcons)["glyphMap"];
};

const BUTTONS: ToolbarButton[] = [
    { command: "bold", icon: "format-bold" },
    { command: "italic", icon: "format-italic" },
    { command: "strikethrough", icon: "format-strikethrough" },
    { command: "code", icon: "code-tags" },
    { command: "heading", icon: "format-header-pound" },
    { command: "bulletList", icon: "format-list-bulleted" },
    { command: "orderedList", icon: "format-list-numbered" },
    { command: "checklist", icon: "format-list-checks" },
    { command: "blockquote", icon: "format-quote-close" },
    { command: "link", icon: "link-variant" },
];

type EditorToolbarProps = {
    onCommand: (command: EditorCommand) => void;
};

export function EditorToolbar({ onCommand }: EditorToolbarProps) {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const styles = createStyles(theme, insets);

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            style={styles.container}
            contentContainerStyle={styles.content}
        >
            {BUTTONS.map((button) => (
                <Pressable
                    key={button.command}
                    onPress={() => onCommand(button.command)}
                    style={styles.button}
                    hitSlop={8}
                >
                    <MaterialCommunityIcons name={button.icon} size={22} color={theme.foreground} />
                </Pressable>
            ))}
        </ScrollView>
    );
}

function createStyles(theme: Theme, insets: EdgeInsets) {
    return StyleSheet.create({
        container: {
            borderTopWidth: 1,
            borderTopColor: theme.subtleBorder,
            backgroundColor: theme.background,
            // Clears the home indicator while the keyboard is down. The screen
            // cancels exactly this much via KeyboardStickyView's `opened`
            // offset once the keyboard covers that strip anyway.
            paddingBottom: insets.bottom,
        },
        content: {
            paddingHorizontal: 12,
            alignItems: "center",
            gap: 20,
            // flexGrow rather than a width cap: this scrolls horizontally, so
            // pinning its width would stop it scrolling on a narrow screen.
            // Growing to fill lets justifyContent centre the buttons under the
            // centred editor once they all fit, and changes nothing when they
            // don't.
            flexGrow: 1,
            justifyContent: "center",
        },
        button: {
            paddingVertical: 10,
        },
    });
}
