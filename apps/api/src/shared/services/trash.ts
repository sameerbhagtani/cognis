import { db, eq, schemas, sql } from "@cognis/database";

import { lockWorkspace, type Tx } from "./workspaceLock.js";
import ApiError from "../utils/ApiError.js";

/**
 * A row whose parent folder is trashed under a different batch would come back
 * live but unreachable — absent from the tree because its parent is gone, and
 * absent from the trash because it isn't trashed.
 *
 * The whole batch is checked, not just the row the caller named: restoring via a
 * leaf would otherwise skip the batch root, whose parent is the one most likely
 * to sit outside the batch.
 */
async function isBatchRestoreBlocked(tx: Tx, deletedBatchId: string) {
    const result = await tx.execute(sql`
        SELECT EXISTS (
            SELECT 1
            FROM folder child
            JOIN folder parent ON parent.id = child.parent_folder_id
            WHERE child.deleted_batch_id = ${deletedBatchId}
              AND parent.deleted_at IS NOT NULL
              AND parent.deleted_batch_id IS DISTINCT FROM ${deletedBatchId}
            UNION ALL
            SELECT 1
            FROM note child
            JOIN folder parent ON parent.id = child.folder_id
            WHERE child.deleted_batch_id = ${deletedBatchId}
              AND parent.deleted_at IS NOT NULL
              AND parent.deleted_batch_id IS DISTINCT FROM ${deletedBatchId}
        ) AS blocked
    `);

    const [row] = result.rows as { blocked: boolean }[];

    return row?.blocked ?? false;
}

/**
 * Checks and restores under one workspace lock. Splitting the two lets a delete
 * land in between and strand the restored rows, so the guard lives in here
 * rather than in each caller, where it could also be forgotten.
 *
 * A batch spans folders and notes, so both tables are always cleared.
 */
export async function restoreBatch(workspaceId: string, deletedBatchId: string) {
    return db.transaction(async (tx) => {
        await lockWorkspace(tx, workspaceId);

        if (await isBatchRestoreBlocked(tx, deletedBatchId)) {
            throw ApiError.conflict("Restore the parent folder first");
        }

        const folders = await tx
            .update(schemas.folder)
            .set({ deletedAt: null, deletedBatchId: null })
            .where(eq(schemas.folder.deletedBatchId, deletedBatchId))
            .returning({ id: schemas.folder.id });

        const notes = await tx
            .update(schemas.note)
            .set({ deletedAt: null, deletedBatchId: null })
            .where(eq(schemas.note.deletedBatchId, deletedBatchId))
            .returning({ id: schemas.note.id });

        // Returned so the caller can broadcast only the events a batch actually
        // warrants, instead of announcing folder and note changes for both.
        return {
            folderIds: folders.map((folder) => folder.id),
            noteIds: notes.map((note) => note.id),
        };
    });
}

export async function findBatchWorkspaceId(deletedBatchId: string) {
    const result = await db.execute(sql`
        SELECT workspace_id FROM folder WHERE deleted_batch_id = ${deletedBatchId}
        UNION
        SELECT workspace_id FROM note WHERE deleted_batch_id = ${deletedBatchId}
        LIMIT 1
    `);

    const [row] = result.rows as { workspace_id: string }[];

    return row?.workspace_id ?? null;
}
