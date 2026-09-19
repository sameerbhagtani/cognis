import { and, asc, db, eq, isNotNull, schemas } from "@cognis/database";

type TrashedFolder = typeof schemas.folder.$inferSelect;
type TrashedNote = typeof schemas.note.$inferSelect;

export type TrashBatch = {
    deletedBatchId: string;
    deletedAt: Date;
    folders: TrashedFolder[];
    notes: TrashedNote[];
};

/**
 * Groups the workspace's trashed rows by the batch they were deleted in, so the
 * client can restore a delete action as the unit it happened in rather than
 * item by item.
 */
export async function listTrash(workspaceId: string): Promise<TrashBatch[]> {
    const [folders, notes] = await Promise.all([
        db
            .select()
            .from(schemas.folder)
            .where(
                and(
                    eq(schemas.folder.workspaceId, workspaceId),
                    isNotNull(schemas.folder.deletedAt),
                    isNotNull(schemas.folder.deletedBatchId),
                ),
            )
            .orderBy(asc(schemas.folder.name)),
        db
            .select()
            .from(schemas.note)
            .where(
                and(
                    eq(schemas.note.workspaceId, workspaceId),
                    isNotNull(schemas.note.deletedAt),
                    isNotNull(schemas.note.deletedBatchId),
                ),
            )
            .orderBy(asc(schemas.note.title)),
    ]);

    const batches = new Map<string, TrashBatch>();

    function batchFor(deletedBatchId: string, deletedAt: Date) {
        const existing = batches.get(deletedBatchId);
        if (existing) return existing;

        const created: TrashBatch = { deletedBatchId, deletedAt, folders: [], notes: [] };
        batches.set(deletedBatchId, created);

        return created;
    }

    for (const folder of folders) {
        batchFor(folder.deletedBatchId!, folder.deletedAt!).folders.push(folder);
    }

    for (const note of notes) {
        batchFor(note.deletedBatchId!, note.deletedAt!).notes.push(note);
    }

    return [...batches.values()].sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
}
