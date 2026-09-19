import { and, db, eq, inArray, lt, schemas, sql } from "@cognis/database";

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

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The only path that hard-deletes folders and notes. Everything else soft
 * deletes, so keeping the real DELETE in one place means there is one thing to
 * reason about when asking how a row can actually disappear.
 *
 * Takes the workspace lock like the other tree operations, so a restore can't be
 * reading rows this is about to remove.
 *
 * ON DELETE CASCADE makes this sharper than it looks: deleting an expired folder
 * takes its whole subtree, expired or not. Today a row can only be trashed at or
 * before its parent, so an expired folder's subtree is always expired too — but
 * that holds because of how restore behaves, not because anything enforces it.
 * Since this is the only irreversible operation here, a folder whose subtree
 * still contains a live or recently trashed row is skipped and reported rather
 * than trusted, and purges on a later run once the rest of it expires.
 */
export async function purgeExpiredTrash(retentionDays: number) {
    const cutoff = new Date(Date.now() - retentionDays * MS_PER_DAY);

    const scan = await db.execute(sql`
        SELECT workspace_id FROM folder WHERE deleted_at < ${cutoff}
        UNION
        SELECT workspace_id FROM note WHERE deleted_at < ${cutoff}
    `);

    const workspaceIds = (scan.rows as { workspace_id: string }[]).map((row) => row.workspace_id);

    let folders = 0;
    let notes = 0;
    let skipped = 0;

    for (const workspaceId of workspaceIds) {
        await db.transaction(async (tx) => {
            await lockWorkspace(tx, workspaceId);

            const expiredNotes = await tx
                .select({ id: schemas.note.id })
                .from(schemas.note)
                .where(
                    and(
                        eq(schemas.note.workspaceId, workspaceId),
                        lt(schemas.note.deletedAt, cutoff),
                    ),
                );

            const expiredFolders = await tx
                .select({ id: schemas.folder.id })
                .from(schemas.folder)
                .where(
                    and(
                        eq(schemas.folder.workspaceId, workspaceId),
                        lt(schemas.folder.deletedAt, cutoff),
                    ),
                );

            // Roots whose subtree still holds something the cascade must not take.
            const unsafe = await tx.execute(sql`
                WITH RECURSIVE subtree AS (
                    SELECT id AS root_id, id AS node_id
                    FROM folder
                    WHERE workspace_id = ${workspaceId} AND deleted_at < ${cutoff}
                    UNION
                    SELECT parent.root_id, child.id
                    FROM subtree parent
                    JOIN folder child ON child.parent_folder_id = parent.node_id
                )
                SELECT DISTINCT subtree.root_id
                FROM subtree
                JOIN folder node ON node.id = subtree.node_id
                WHERE node.deleted_at IS NULL
                   OR node.deleted_at >= ${cutoff}
                   OR EXISTS (
                        SELECT 1 FROM note
                        WHERE note.folder_id = subtree.node_id
                          AND (note.deleted_at IS NULL OR note.deleted_at >= ${cutoff})
                   )
            `);

            const unsafeRoots = new Set(
                (unsafe.rows as { root_id: string }[]).map((row) => row.root_id),
            );

            const purgeableFolders = expiredFolders.filter((folder) => !unsafeRoots.has(folder.id));

            if (unsafeRoots.size > 0) {
                console.warn(
                    `skipped ${unsafeRoots.size} expired folder(s) in workspace ${workspaceId}: ` +
                        `subtree still holds rows inside the retention window`,
                );
                skipped += unsafeRoots.size;
            }

            if (expiredNotes.length > 0) {
                await tx.delete(schemas.note).where(
                    inArray(
                        schemas.note.id,
                        expiredNotes.map((note) => note.id),
                    ),
                );
            }

            if (purgeableFolders.length > 0) {
                await tx.delete(schemas.folder).where(
                    inArray(
                        schemas.folder.id,
                        purgeableFolders.map((folder) => folder.id),
                    ),
                );
            }

            notes += expiredNotes.length;
            folders += purgeableFolders.length;
        });
    }

    return { cutoff, workspaces: workspaceIds.length, folders, notes, skipped };
}
