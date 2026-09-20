import { randomUUID } from "node:crypto";

import { and, asc, db, eq, getColumns, isNull, schemas } from "@cognis/database";

import { getLiveFolder } from "../folder/service.js";
import { lockWorkspace, type DbOrTx } from "../../shared/services/workspaceLock.js";
import ApiError from "../../shared/utils/ApiError.js";

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

/**
 * Locked for the same reason a folder create is: checking that the folder is
 * live and then inserting outside a transaction lets a concurrent soft delete
 * trash that folder in between, leaving a live note inside a trashed one —
 * absent from the tree and absent from the trash. A note at the workspace root
 * has no folder to be trashed underneath it, so it inserts directly.
 */
export async function createNote(values: {
    workspaceId: string;
    folderId: string | null;
    title: string;
    content: string | null;
}) {
    const { workspaceId, folderId } = values;

    if (folderId === null) {
        const [created] = await db.insert(schemas.note).values(values).returning();

        return created;
    }

    return db.transaction(async (tx) => {
        await lockWorkspace(tx, workspaceId);

        const folder = await getLiveFolder(workspaceId, folderId, tx);
        if (!folder) throw ApiError.notFound("Folder not found");

        const [created] = await tx.insert(schemas.note).values(values).returning();

        return created;
    });
}

async function writeNote(
    executor: DbOrTx,
    noteId: string,
    values: { title?: string; content?: string | null; folderId?: string | null },
) {
    const [updated] = await executor
        .update(schemas.note)
        .set(values)
        .where(eq(schemas.note.id, noteId))
        .returning();

    return updated;
}

/**
 * A title or content edit reads no tree structure, so it writes directly. That
 * also keeps autosave — by far the most frequent write here — off the workspace
 * lock, where it would serialize against every move, delete and restore in the
 * workspace.
 *
 * A move is the case that needs the lock: checking the target folder is live and
 * then writing outside a transaction lets a concurrent delete trash that folder
 * in between, leaving the note live inside a trashed one. Same orphan a folder
 * move guards against, reached through the note instead.
 */
export async function applyNoteUpdate(
    note: Note,
    values: { title?: string; content?: string | null; folderId?: string | null },
) {
    const { folderId } = values;

    if (folderId === undefined) return writeNote(db, note.id, values);

    return db.transaction(async (tx) => {
        await lockWorkspace(tx, note.workspaceId);

        if (folderId !== null) {
            const folder = await getLiveFolder(note.workspaceId, folderId, tx);
            if (!folder) throw ApiError.notFound("Folder not found");
        }

        return writeNote(tx, note.id, values);
    });
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
