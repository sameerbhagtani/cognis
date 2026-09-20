import { forwardRef, useImperativeHandle, useState } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { collectSubtreeIds, useNotes, type TreeFolder, type TreeNode } from "@/lib/notes";
import useTheme from "@/lib/theme/useTheme";
import { useWorkspace } from "@/lib/workspace";
import {
    createFolder,
    createNote,
    deleteFolder,
    deleteNote,
    updateFolder,
    updateNote,
} from "@/modules/note/api";
import { ActionSheet, type SheetAction } from "./ActionSheet";
import { FolderPickerDialog } from "./FolderPickerDialog";
import { PromptDialog } from "./PromptDialog";

import type { Theme } from "@cognis/types";

type FileTreeProps = {
    /** Opens the note and closes the drawer. */
    onOpenNote: (noteId: string) => void;
};

/**
 * Lets the drawer put the create buttons where Obsidian does - down by the
 * workspace bar - while the creation flow itself stays here with the rest of
 * the tree's mutations.
 */
export type FileTreeHandle = {
    promptNewNote: () => void;
    promptNewFolder: () => void;
};

/** Which dialog is open, and what it's acting on. */
type Dialog =
    | { kind: "none" }
    | { kind: "menu"; node: TreeNode }
    | { kind: "rename"; node: TreeNode }
    | { kind: "move"; node: TreeNode }
    | { kind: "newNote"; parentFolderId: string | null }
    | { kind: "newFolder"; parentFolderId: string | null };

export const FileTree = forwardRef<FileTreeHandle, FileTreeProps>(function FileTree(
    { onOpenNote },
    ref,
) {
    const { theme } = useTheme();
    const { activeWorkspace } = useWorkspace();
    const { tree, isLoading, error, refresh } = useNotes();

    const styles = createStyles(theme);

    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [dialog, setDialog] = useState<Dialog>({ kind: "none" });

    const canWrite = activeWorkspace?.role === "owner" || activeWorkspace?.role === "editor";
    const workspaceId = activeWorkspace?.id;

    useImperativeHandle(ref, () => ({
        promptNewNote: () => setDialog({ kind: "newNote", parentFolderId: null }),
        promptNewFolder: () => setDialog({ kind: "newFolder", parentFolderId: null }),
    }));

    function closeDialog() {
        setDialog({ kind: "none" });
    }

    function toggleFolder(folderId: string) {
        setExpanded((current) => ({ ...current, [folderId]: !current[folderId] }));
    }

    function menuActions(node: TreeNode): SheetAction[] {
        const actions: SheetAction[] = [
            {
                label: "Rename",
                icon: "rename-outline",
                onPress: () => setDialog({ kind: "rename", node }),
            },
            {
                label: "Move to…",
                icon: "folder-move-outline",
                onPress: () => setDialog({ kind: "move", node }),
            },
        ];

        if (node.kind === "folder") {
            actions.push(
                {
                    label: "New note here",
                    icon: "note-plus-outline",
                    onPress: () => setDialog({ kind: "newNote", parentFolderId: node.id }),
                },
                {
                    label: "New folder here",
                    icon: "folder-plus-outline",
                    onPress: () => setDialog({ kind: "newFolder", parentFolderId: node.id }),
                },
            );
        }

        actions.push({
            label: node.kind === "folder" ? "Delete folder" : "Delete note",
            icon: "trash-can-outline",
            destructive: true,
            onPress: () => void remove(node),
        });

        return actions;
    }

    async function remove(node: TreeNode) {
        if (node.kind === "folder") await deleteFolder(node.id);
        else await deleteNote(node.id);

        await refresh();
    }

    async function rename(node: TreeNode, value: string) {
        if (node.kind === "folder") await updateFolder(node.id, { name: value });
        else await updateNote(node.id, { title: value });

        await refresh();
    }

    async function move(node: TreeNode, destinationId: string | null) {
        if (node.kind === "folder") await updateFolder(node.id, { parentFolderId: destinationId });
        else await updateNote(node.id, { folderId: destinationId });

        await refresh();
    }

    async function addNote(parentFolderId: string | null, title: string) {
        if (!workspaceId) return;

        const note = await createNote(workspaceId, title, parentFolderId);
        await refresh();

        if (parentFolderId) setExpanded((current) => ({ ...current, [parentFolderId]: true }));

        onOpenNote(note.id);
    }

    async function addFolder(parentFolderId: string | null, name: string) {
        if (!workspaceId) return;

        await createFolder(workspaceId, name, parentFolderId);
        await refresh();

        if (parentFolderId) setExpanded((current) => ({ ...current, [parentFolderId]: true }));
    }

    function renderNode(node: TreeNode, depth: number) {
        const isFolder = node.kind === "folder";
        const isOpen = isFolder && expanded[node.id];

        return (
            <View key={`${node.kind}:${node.id}`}>
                <Pressable
                    onPress={() => (isFolder ? toggleFolder(node.id) : onOpenNote(node.id))}
                    onLongPress={() => canWrite && setDialog({ kind: "menu", node })}
                    style={({ pressed }) => [
                        styles.row,
                        { paddingLeft: 12 + depth * 14, opacity: pressed ? 0.6 : 1 },
                    ]}
                >
                    <MaterialCommunityIcons
                        name={
                            isFolder
                                ? isOpen
                                    ? "folder-open-outline"
                                    : "folder-outline"
                                : "file-outline"
                        }
                        size={16}
                        color={theme.foreground}
                    />
                    <Text style={styles.rowText} numberOfLines={1}>
                        {node.kind === "folder" ? node.name : node.title}
                    </Text>
                </Pressable>

                {isFolder && isOpen && node.children.map((child) => renderNode(child, depth + 1))}
            </View>
        );
    }

    if (isLoading) return <Text style={styles.status}>Loading…</Text>;

    if (error) {
        return (
            <View style={styles.statusBlock}>
                <Text style={styles.error}>{error}</Text>
                <Text style={styles.retry} onPress={() => void refresh()}>
                    Try again
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                {tree.length === 0 ? (
                    <Text style={styles.status}>
                        {canWrite ? "No notes yet. Create one below." : "Nothing here yet."}
                    </Text>
                ) : (
                    tree.map((node) => renderNode(node, 0))
                )}
            </ScrollView>

            <ActionSheet
                visible={dialog.kind === "menu"}
                title={
                    dialog.kind === "menu"
                        ? dialog.node.kind === "folder"
                            ? dialog.node.name
                            : dialog.node.title
                        : ""
                }
                actions={dialog.kind === "menu" ? menuActions(dialog.node) : []}
                onClose={closeDialog}
            />

            {dialog.kind === "rename" && (
                <PromptDialog
                    visible
                    title={dialog.node.kind === "folder" ? "Rename folder" : "Rename note"}
                    placeholder="Name"
                    initialValue={
                        dialog.node.kind === "folder" ? dialog.node.name : dialog.node.title
                    }
                    confirmLabel="Rename"
                    onConfirm={(value) => rename(dialog.node, value)}
                    onClose={closeDialog}
                />
            )}

            {dialog.kind === "newNote" && (
                <PromptDialog
                    visible
                    title="New note"
                    placeholder="Title"
                    confirmLabel="Create"
                    onConfirm={(value) => addNote(dialog.parentFolderId, value)}
                    onClose={closeDialog}
                />
            )}

            {dialog.kind === "newFolder" && (
                <PromptDialog
                    visible
                    title="New folder"
                    placeholder="Name"
                    confirmLabel="Create"
                    onConfirm={(value) => addFolder(dialog.parentFolderId, value)}
                    onClose={closeDialog}
                />
            )}

            {dialog.kind === "move" && (
                <FolderPickerDialog
                    visible
                    title="Move to"
                    tree={tree}
                    // A folder can't land inside itself or its own descendants;
                    // the API rejects it, so it's greyed out rather than offered.
                    disabledIds={
                        dialog.node.kind === "folder"
                            ? collectSubtreeIds(dialog.node as TreeFolder)
                            : undefined
                    }
                    onSelect={(destinationId) => void move(dialog.node, destinationId)}
                    onClose={closeDialog}
                />
            )}
        </View>
    );
});

function createStyles(theme: Theme) {
    return StyleSheet.create({
        container: {
            flex: 1,
        },
        list: {
            flex: 1,
        },
        listContent: {
            paddingBottom: 12,
        },
        row: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingVertical: 9,
            paddingRight: 12,
        },
        rowText: {
            flex: 1,
            fontSize: 14,
            color: theme.foreground,
        },
        status: {
            fontSize: 13,
            color: theme.foreground,
            opacity: 0.5,
            textAlign: "center",
            paddingHorizontal: 24,
            paddingVertical: 16,
        },
        statusBlock: {
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 24,
            paddingVertical: 16,
        },
        error: {
            fontSize: 13,
            color: theme.danger,
            textAlign: "center",
        },
        retry: {
            fontSize: 13,
            fontWeight: "600",
            color: theme.primary,
        },
    });
}
