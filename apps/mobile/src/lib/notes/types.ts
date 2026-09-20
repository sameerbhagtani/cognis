import type { Folder, Note } from "@/modules/note/types";
import type { TreeNode } from "./tree";

export type NotesContextType = {
    folders: Folder[];
    notes: Note[];
    /** The workspace's folders and notes, assembled into one tree. */
    tree: TreeNode[];
    isLoading: boolean;
    error: string | null;
    /** Refetches both lists. Mutations call this rather than patching locally. */
    refresh: () => Promise<void>;
    /**
     * Local-only patch, no refetch. The editor's autosave uses it so a retitled
     * note updates in the sidebar without a round trip per keystroke window.
     */
    applyNotePatch: (noteId: string, patch: Partial<Note>) => void;
};
