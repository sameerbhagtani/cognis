/**
 * Mirrors the `note` and `folder` rows the API returns. Timestamps are strings:
 * they arrive as JSON and nothing revives them into Dates.
 *
 * Both carry `deletedAt`/`deletedBatchId`, but list endpoints only ever return
 * live rows - trashed ones are filtered server-side, and there's no trash UI yet.
 */
export type Note = {
    id: string;
    workspaceId: string;
    folderId: string | null;
    title: string;
    content: string | null;
    deletedAt: string | null;
    deletedBatchId: string | null;
    createdAt: string;
    updatedAt: string;
};

export type Folder = {
    id: string;
    workspaceId: string;
    parentFolderId: string | null;
    name: string;
    deletedAt: string | null;
    deletedBatchId: string | null;
    createdAt: string;
    updatedAt: string;
};
