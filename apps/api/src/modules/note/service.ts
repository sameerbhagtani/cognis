import { randomUUID } from "node:crypto";

import { and, asc, db, eq, getColumns, isNull, schemas } from "@cognis/database";

import { lockWorkspace } from "../../shared/services/workspaceLock.js";

export type Note = typeof schemas.note.$inferSelect;

export async function getNoteForUser(noteId: string, userId: string) {
    const [row] = await db
        .select({
            note: getColumns(schemas.note),
            role: schemas.workspaceMember.role,
        })
        .from(schemas.note)
        .innerJoin(
            schemas.workspaceMember,
            and(
                eq(schemas.workspaceMember.workspaceId, schemas.note.workspaceId),
                eq(schemas.workspaceMember.userId, userId),
            ),
        )
        .where(eq(schemas.note.id, noteId))
        .limit(1);

    return row ?? null;
}

export async function listNotes(workspaceId: string, folderId?: string | null) {
    const folderFilter =
        folderId === undefined
            ? undefined
            : folderId === null
              ? isNull(schemas.note.folderId)
              : eq(schemas.note.folderId, folderId);

    return db
        .select()
        .from(schemas.note)
        .where(
            and(
                eq(schemas.note.workspaceId, workspaceId),
                isNull(schemas.note.deletedAt),
                folderFilter,
            ),
        )
        .orderBy(asc(schemas.note.title));
}

export async function createNote(values: {
    workspaceId: string;
    folderId: string | null;
    title: string;
    content: string | null;
}) {
    const [created] = await db.insert(schemas.note).values(values).returning();

    return created;
}

export async function updateNote(
    noteId: string,
    values: { title?: string; content?: string | null; folderId?: string | null },
) {
    const [updated] = await db
        .update(schemas.note)
        .set(values)
        .where(eq(schemas.note.id, noteId))
        .returning();

    return updated;
}

/**
 * A note has no descendants, so there's no cascade to walk — but it still gets a
 * deletedBatchId so the trash view can group it and restore it by batch the same
 * way it handles a folder subtree.
 */
export async function softDeleteNote(workspaceId: string, noteId: string) {
    const deletedBatchId = randomUUID();

    // Locked for the same reason a folder delete is: a restore running alongside
    // checks whether this note's folder is trashed, and must not see a state this
    // delete is midway through writing.
    await db.transaction(async (tx) => {
        await lockWorkspace(tx, workspaceId);

        await tx
            .update(schemas.note)
            .set({ deletedAt: new Date(), deletedBatchId })
            .where(eq(schemas.note.id, noteId));
    });

    return deletedBatchId;
}
