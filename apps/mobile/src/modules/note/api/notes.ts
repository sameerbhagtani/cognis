import { api } from "@/lib/api";

import type { ApiSuccess } from "@/lib/api";
import type { Note } from "../types";

/**
 * Every live note in the workspace. The list endpoint doesn't return content -
 * only the tree needs these, and the editor fetches the one note it opens.
 */
export async function fetchNotes(workspaceId: string): Promise<Note[]> {
    const { data } = await api.get<ApiSuccess<Note[]>>(`/workspaces/${workspaceId}/notes`);

    return data.data;
}

export async function fetchNote(noteId: string): Promise<Note> {
    const { data } = await api.get<ApiSuccess<Note>>(`/notes/${noteId}`);

    return data.data;
}

export async function createNote(
    workspaceId: string,
    title: string,
    folderId: string | null,
): Promise<Note> {
    const { data } = await api.post<ApiSuccess<Note>>(`/workspaces/${workspaceId}/notes`, {
        title,
        folderId,
    });

    return data.data;
}

/**
 * Title, content, move, or any combination. `folderId: null` is a move to the
 * workspace root, so it stays distinguishable from the key being absent.
 */
export async function updateNote(
    noteId: string,
    changes: { title?: string; content?: string | null; folderId?: string | null },
): Promise<Note> {
    const { data } = await api.patch<ApiSuccess<Note>>(`/notes/${noteId}`, changes);

    return data.data;
}

export async function deleteNote(noteId: string): Promise<void> {
    await api.delete(`/notes/${noteId}`);
}
