import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { ApiClientError } from "@/lib/api";
import { getSocket, joinWorkspace, leaveWorkspace } from "@/lib/socket";
import { useWorkspace } from "@/lib/workspace";
import { fetchFolders, fetchNotes } from "@/modules/note/api";
import NotesContext from "./NotesContext";
import { buildTree } from "./tree";

import type { Folder, Note } from "@/modules/note/types";

/** Anything that changes the shape of the tree. */
const STRUCTURE_EVENTS = [
    "note:created",
    "note:moved",
    "note:deleted",
    "note:restored",
    "folder:created",
    "folder:updated",
    "folder:moved",
    "folder:deleted",
    "folder:restored",
] as const;

type NoteUpdatedPayload = {
    id: string;
    title: string;
    folderId: string | null;
    updatedAt: string;
};

/** Everything held for one workspace, tagged with which workspace that is. */
type Loaded = {
    workspaceId: string;
    folders: Folder[];
    notes: Note[];
    error: string | null;
};

// Stable identities, so deriving "nothing loaded yet" doesn't churn the memo.
const NO_FOLDERS: Folder[] = [];
const NO_NOTES: Note[] = [];

function describeError(err: unknown): string {
    return err instanceof ApiClientError ? err.message : "Could not load this workspace's notes";
}

export default function NotesProvider({ children }: { children: ReactNode }) {
    const { activeWorkspace } = useWorkspace();
    const workspaceId = activeWorkspace?.id ?? null;

    const [loaded, setLoaded] = useState<Loaded | null>(null);

    // Tagging the data with its workspace means switching workspaces makes what
    // we hold stale by definition - no need to clear it synchronously, which is
    // both a render-time side effect and a source of flicker.
    const isCurrent = loaded !== null && loaded.workspaceId === workspaceId;
    const folders = isCurrent ? loaded.folders : NO_FOLDERS;
    const notes = isCurrent ? loaded.notes : NO_NOTES;
    const error = isCurrent ? loaded.error : null;
    const isLoading = workspaceId !== null && !isCurrent;

    const applyNotePatch = useCallback((noteId: string, patch: Partial<Note>) => {
        setLoaded((current) =>
            current === null
                ? current
                : {
                      ...current,
                      notes: current.notes.map((note) =>
                          note.id === noteId ? { ...note, ...patch } : note,
                      ),
                  },
        );
    }, []);

    const refresh = useCallback(async () => {
        if (!workspaceId) return;

        try {
            const [nextFolders, nextNotes] = await Promise.all([
                fetchFolders(workspaceId),
                fetchNotes(workspaceId),
            ]);

            setLoaded({ workspaceId, folders: nextFolders, notes: nextNotes, error: null });
        } catch (err) {
            setLoaded({
                workspaceId,
                folders: NO_FOLDERS,
                notes: NO_NOTES,
                error: describeError(err),
            });
        }
    }, [workspaceId]);

    useEffect(() => {
        if (!workspaceId) return;

        let cancelled = false;

        Promise.all([fetchFolders(workspaceId), fetchNotes(workspaceId)])
            .then(([nextFolders, nextNotes]) => {
                if (cancelled) return;

                setLoaded({ workspaceId, folders: nextFolders, notes: nextNotes, error: null });
            })
            .catch((err: unknown) => {
                if (cancelled) return;

                setLoaded({
                    workspaceId,
                    folders: NO_FOLDERS,
                    notes: NO_NOTES,
                    error: describeError(err),
                });
            });

        return () => {
            cancelled = true;
        };
    }, [workspaceId]);

    // Live updates from everyone else in the workspace.
    useEffect(() => {
        if (!workspaceId) return;

        let cancelled = false;

        // A structural change names only the row that changed - the API
        // deliberately doesn't serialise affected subtrees - so refetching is
        // what resolves it.
        const onStructureChange = () => void refresh();

        // note:updated is the exception: it fires on every autosave, so patching
        // the title locally beats refetching the whole workspace each time.
        const onNoteUpdated = (payload: NoteUpdatedPayload) => {
            applyNotePatch(payload.id, {
                title: payload.title,
                folderId: payload.folderId,
                updatedAt: payload.updatedAt,
            });
        };

        void joinWorkspace(workspaceId);

        void getSocket().then((socket) => {
            if (cancelled) return;

            for (const event of STRUCTURE_EVENTS) socket.on(event, onStructureChange);
            socket.on("note:updated", onNoteUpdated);
        });

        return () => {
            cancelled = true;

            void leaveWorkspace(workspaceId);
            void getSocket().then((socket) => {
                for (const event of STRUCTURE_EVENTS) socket.off(event, onStructureChange);
                socket.off("note:updated", onNoteUpdated);
            });
        };
    }, [workspaceId, refresh, applyNotePatch]);

    const value = useMemo(
        () => ({
            folders,
            notes,
            tree: buildTree(folders, notes),
            isLoading,
            error,
            refresh,
            applyNotePatch,
        }),
        [folders, notes, isLoading, error, refresh, applyNotePatch],
    );

    return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}
