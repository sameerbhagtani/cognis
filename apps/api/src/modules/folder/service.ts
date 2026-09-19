import { randomUUID } from "node:crypto";

import { and, asc, db, eq, getColumns, inArray, isNull, schemas, sql } from "@cognis/database";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbOrTx = typeof db | Tx;

export type Folder = typeof schemas.folder.$inferSelect;

/**
 * Returns the folder plus every descendant id, including soft-deleted rows: a
 * trashed folder still carries a parentFolderId, so it's structurally part of the
 * tree and a cycle through it would still hang a recursive CTE.
 *
 * Serves both the soft-delete cascade and the move cycle check, which is why the
 * root id is included — "move into itself" falls out of the same containment test.
 */
export async function getFolderSubtreeIds(folderId: string, executor: DbOrTx = db) {
    const result = await executor.execute(sql`
        WITH RECURSIVE subtree AS (
            SELECT id FROM folder WHERE id = ${folderId}
            UNION ALL
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

export async function getLiveFolder(workspaceId: string, folderId: string) {
    const [folder] = await db
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

export async function createFolder(
    workspaceId: string,
    name: string,
    parentFolderId: string | null,
) {
    const [created] = await db
        .insert(schemas.folder)
        .values({ workspaceId, name, parentFolderId })
        .returning();

    return created;
}

export async function updateFolder(
    folderId: string,
    values: { name?: string; parentFolderId?: string | null },
) {
    const [updated] = await db
        .update(schemas.folder)
        .set(values)
        .where(eq(schemas.folder.id, folderId))
        .returning();

    return updated;
}

/**
 * Stamps the folder and its subtree with one shared deletedBatchId. The
 * `deletedAt IS NULL` guard is what keeps an already-trashed child from being
 * re-stamped into this batch, which would otherwise resurrect it when this batch
 * is restored.
 */
export async function softDeleteFolder(folderId: string) {
    const deletedBatchId = randomUUID();
    const deletedAt = new Date();

    await db.transaction(async (tx) => {
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

/**
 * Answers whether a folder blocks restoring `deletedBatchId`. A folder trashed in
 * that same batch is coming back with it, so only a folder trashed under a
 * different batch is an obstacle.
 */
export async function isFolderTrashedOutsideBatch(folderId: string, deletedBatchId: string) {
    const [row] = await db
        .select({
            deletedAt: schemas.folder.deletedAt,
            deletedBatchId: schemas.folder.deletedBatchId,
        })
        .from(schemas.folder)
        .where(eq(schemas.folder.id, folderId))
        .limit(1);

    if (!row?.deletedAt) return false;

    return row.deletedBatchId !== deletedBatchId;
}
