import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Modal, Pressable, ScrollView, StyleSheet, Text } from "react-native";

import useTheme from "@/lib/theme/useTheme";
import { flattenFolders, type TreeNode } from "@/lib/notes";

import type { Theme } from "@cognis/types";

type FolderPickerDialogProps = {
    visible: boolean;
    title: string;
    tree: TreeNode[];
    /** Folders that can't be picked - a folder's own subtree, when moving it. */
    disabledIds?: Set<string>;
    onSelect: (folderId: string | null) => void;
    onClose: () => void;
};

/**
 * Picks a destination folder, or the workspace root. Used instead of drag and
 * drop, which the PRD deliberately traded away: the same outcome, far less
 * fragile on touch.
 */
export function FolderPickerDialog({
    visible,
    title,
    tree,
    disabledIds,
    onSelect,
    onClose,
}: FolderPickerDialogProps) {
    const { theme } = useTheme();
    const styles = createStyles(theme);

    const options = flattenFolders(tree);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.dialog} onPress={() => {}}>
                    <Text style={styles.title}>{title}</Text>

                    <ScrollView style={styles.list}>
                        <Pressable
                            onPress={() => {
                                onClose();
                                onSelect(null);
                            }}
                            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
                        >
                            <MaterialCommunityIcons
                                name="home-outline"
                                size={18}
                                color={theme.foreground}
                            />
                            <Text style={styles.rowText}>Workspace root</Text>
                        </Pressable>

                        {options.map(({ folder, depth }) => {
                            const disabled = disabledIds?.has(folder.id) ?? false;

                            return (
                                <Pressable
                                    key={folder.id}
                                    disabled={disabled}
                                    onPress={() => {
                                        onClose();
                                        onSelect(folder.id);
                                    }}
                                    style={({ pressed }) => [
                                        styles.row,
                                        { paddingLeft: 16 + depth * 16 },
                                        { opacity: disabled ? 0.35 : pressed ? 0.6 : 1 },
                                    ]}
                                >
                                    <MaterialCommunityIcons
                                        name="folder-outline"
                                        size={18}
                                        color={theme.foreground}
                                    />
                                    <Text style={styles.rowText} numberOfLines={1}>
                                        {folder.name}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>

                    <Pressable onPress={onClose} style={styles.cancel}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </Pressable>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

function createStyles(theme: Theme) {
    return StyleSheet.create({
        backdrop: {
            flex: 1,
            backgroundColor: "#00000080",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 32,
        },
        dialog: {
            width: "100%",
            maxWidth: 400,
            maxHeight: "70%",
            backgroundColor: theme.background,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.subtleBorder,
            paddingVertical: 16,
        },
        title: {
            fontSize: 16,
            fontWeight: "600",
            color: theme.foreground,
            paddingHorizontal: 20,
            paddingBottom: 12,
        },
        list: {
            flexGrow: 0,
        },
        row: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingVertical: 12,
            paddingHorizontal: 16,
        },
        rowText: {
            flex: 1,
            fontSize: 15,
            color: theme.foreground,
        },
        cancel: {
            alignItems: "center",
            paddingTop: 12,
        },
        cancelText: {
            fontSize: 15,
            color: theme.foreground,
            opacity: 0.7,
        },
    });
}
