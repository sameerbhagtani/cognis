import { randomUUID } from "node:crypto";

import { and, asc, db, eq, getColumns, inArray, isNull, schemas, sql } from "@cognis/database";

import { lockWorkspace, type DbOrTx } from "../../shared/services/workspaceLock.js";
import ApiError from "../../shared/utils/ApiError.js";

export type Folder = typeof schemas.folder.$inferSelect;

/**
 * Returns the folder plus every descendant id, including soft-deleted rows: a
 * trashed folder still carries a parentFolderId, so it's structurally part of the
 * tree and a cycle through it would still be reachable.
 *
 * Serves both the soft-delete cascade and the move cycle check, which is why the
 * root id is included — "move into itself" falls out of the same containment test.
 *
 * UNION rather than UNION ALL: results are identical for a tree, where every node
 * is reached exactly once, but if a cycle ever did exist UNION terminates on the
 * duplicate while UNION ALL would spin until the query is killed.
 */
export async function getFolderSubtreeIds(folderId: string, executor: DbOrTx = db) {
    const result = await executor.execute(sql`
        WITH RECURSIVE subtree AS (
            SELECT id FROM folder WHERE id = ${folderId}
            UNION
            SELECT child.id FROM folder child JOIN subtree ON child.parent_folder_id = subtree.id
        )
        SELECT id FROM subtree
    `);

    return (result.rows as { id: string }[]).map((row) => row.id);
}

export async function getFolderForUser(folderId: string, userId: string) {
    const [row] = await db
        .select({
            folder: getColumns(schemas.folder),
            role: schemas.workspaceMember.role,
        })
        .from(schemas.folder)
        .innerJoin(
            schemas.workspaceMember,
            and(
                eq(schemas.workspaceMember.workspaceId, schemas.folder.workspaceId),
                eq(schemas.workspaceMember.userId, userId),
            ),
        )
        .where(eq(schemas.folder.id, folderId))
        .limit(1);

    return row ?? null;
}

export async function getLiveFolder(workspaceId: string, folderId: string, executor: DbOrTx = db) {
    const [folder] = await executor
        .select()
        .from(schemas.folder)
        .where(
            and(
                eq(schemas.folder.id, folderId),
                eq(schemas.folder.workspaceId, workspaceId),
                isNull(schemas.folder.deletedAt),
            ),
        )
        .limit(1);

    return folder ?? null;
}

export async function listFolders(workspaceId: string, parentFolderId?: string | null) {
    const parentFilter =
        parentFolderId === undefined
            ? undefined
            : parentFolderId === null
              ? isNull(schemas.folder.parentFolderId)
              : eq(schemas.folder.parentFolderId, parentFolderId);

    return db
        .select()
        .from(schemas.folder)
        .where(
            and(
                eq(schemas.folder.workspaceId, workspaceId),
                isNull(schemas.folder.deletedAt),
                parentFilter,
            ),
        )
        .orderBy(asc(schemas.folder.name));
}

/**
 * A create can't form a cycle — a new folder has no descendants — but it can
 * still strand a row. Checking that the parent is live and then inserting
 * outside a transaction leaves a window for a concurrent soft delete to trash
 * that parent, and the insert then lands a live folder under a trashed one:
 * missing from the tree because its parent is gone, and missing from the trash
 * because it was never deleted. That is the same orphan the restore guard
 * exists to prevent, so the check and the insert share the workspace lock the
 * way a move's do.
 *
 * A root-level create has no parent to be trashed underneath it, so it skips
 * the lock and inserts directly.
 */
export async function createFolder(
    workspaceId: string,
    name: string,
    parentFolderId: string | null,
) {
    if (parentFolderId === null) {
        const [created] = await db
            .insert(schemas.folder)
            .values({ workspaceId, name, parentFolderId })
            .returning();

        return created;
    }

    return db.transaction(async (tx) => {
        await lockWorkspace(tx, workspaceId);

        const parent = await getLiveFolder(workspaceId, parentFolderId, tx);
        if (!parent) throw ApiError.notFound("Parent folder not found");

        const [created] = await tx
            .insert(schemas.folder)
            .values({ workspaceId, name, parentFolderId })
            .returning();

        return created;
    });
}

async function writeFolder(
    executor: DbOrTx,
    folderId: string,
    values: { name?: string; parentFolderId?: string | null },
) {
    const [updated] = await executor
        .update(schemas.folder)
        .set(values)
        .where(eq(schemas.folder.id, folderId))
        .returning();

    return updated;
}

/**
 * A rename can't create a cycle, so it writes directly. A move has to validate
 * and write atomically, because the check reads rows that a concurrent move is
 * about to change.
 *
 * Row locks don't help: two moves that would form a cycle (X under Y, Y under X)
 * write disjoint rows and never contend. The shared thing is the workspace, so
 * moves take a transaction-scoped advisory lock on it. Uncontended that costs
 * nothing, it blocks no reads, and it releases on commit or rollback without any
 * retry logic — unlike SERIALIZABLE, which would surface as an error the caller
 * has to replay.
 */
export async function applyFolderUpdate(
    folder: Folder,
    values: { name?: string; parentFolderId?: string | null },
) {
    const { parentFolderId } = values;

    if (parentFolderId === undefined) return writeFolder(db, folder.id, values);

    return db.transaction(async (tx) => {
        await lockWorkspace(tx, folder.workspaceId);

        if (parentFolderId !== null) {
            const parent = await getLiveFolder(folder.workspaceId, parentFolderId, tx);
            if (!parent) throw ApiError.notFound("Parent folder not found");

            // Walked inside the lock, so it sees every move that has committed and
            // excludes any that is still in flight.
            const subtreeIds = await getFolderSubtreeIds(folder.id, tx);
            if (subtreeIds.includes(parentFolderId)) {
                throw ApiError.badRequest(
                    "Cannot move a folder into itself or one of its descendants",
                );
            }
        }

        return writeFolder(tx, folder.id, values);
    });
}

/**
 * Stamps the folder and its subtree with one shared deletedBatchId. The
 * `deletedAt IS NULL` guard is what keeps an already-trashed child from being
 * re-stamped into this batch, which would otherwise resurrect it when this batch
 * is restored.
 */
export async function softDeleteFolder(workspaceId: string, folderId: string) {
    const deletedBatchId = randomUUID();
    const deletedAt = new Date();

    await db.transaction(async (tx) => {
        await lockWorkspace(tx, workspaceId);

        const subtreeIds = await getFolderSubtreeIds(folderId, tx);

        await tx
            .update(schemas.folder)
            .set({ deletedAt, deletedBatchId })
            .where(and(inArray(schemas.folder.id, subtreeIds), isNull(schemas.folder.deletedAt)));

        await tx
            .update(schemas.note)
            .set({ deletedAt, deletedBatchId })
            .where(and(inArray(schemas.note.folderId, subtreeIds), isNull(schemas.note.deletedAt)));
    });

    return deletedBatchId;
}
