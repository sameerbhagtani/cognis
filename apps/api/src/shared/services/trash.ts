import { db, eq, schemas } from "@cognis/database";

/**
 * A batch can span folders and notes, so a restore always clears both tables.
 * Filtering on deletedBatchId rather than "everything under this row" is what
 * makes a restore bring back exactly what was trashed together, and nothing a
 * user had deliberately trashed on its own beforehand.
 */
export async function restoreBatch(deletedBatchId: string) {
    await db.transaction(async (tx) => {
        await tx
            .update(schemas.folder)
            .set({ deletedAt: null, deletedBatchId: null })
            .where(eq(schemas.folder.deletedBatchId, deletedBatchId));

        await tx
            .update(schemas.note)
            .set({ deletedAt: null, deletedBatchId: null })
            .where(eq(schemas.note.deletedBatchId, deletedBatchId));
    });
}
