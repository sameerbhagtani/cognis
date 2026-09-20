import { api } from "@/lib/api";

import type { ApiSuccess } from "@/lib/api";
import type { Folder } from "../types";

/** Omitting the parent filter returns every live folder in the workspace, which
 *  is what the tree is built from - one request beats one per expanded node. */
export async function fetchFolders(workspaceId: string): Promise<Folder[]> {
    const { data } = await api.get<ApiSuccess<Folder[]>>(`/workspaces/${workspaceId}/folders`);

    return data.data;
}

export async function createFolder(
    workspaceId: string,
    name: string,
    parentFolderId: string | null,
): Promise<Folder> {
    const { data } = await api.post<ApiSuccess<Folder>>(`/workspaces/${workspaceId}/folders`, {
        name,
        parentFolderId,
    });

    return data.data;
}

/**
 * Rename, move, or both. `parentFolderId: null` means the workspace root, so it
 * has to stay distinguishable from the key being absent - hence the explicit
 * optional keys rather than a partial spread.
 */
export async function updateFolder(
    folderId: string,
    changes: { name?: string; parentFolderId?: string | null },
): Promise<Folder> {
    const { data } = await api.patch<ApiSuccess<Folder>>(`/folders/${folderId}`, changes);

    return data.data;
}

/** Soft delete: the folder and everything under it go to the trash together. */
export async function deleteFolder(folderId: string): Promise<void> {
    await api.delete(`/folders/${folderId}`);
}
