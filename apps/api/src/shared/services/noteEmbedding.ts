import { createHash } from "node:crypto";

import { and, asc, db, eq, getColumns, isNull, lt, or, schemas, sql } from "@cognis/database";

import { chunkNote } from "../../lib/ai/chunk.js";
import { embedTexts } from "../../lib/ai/embeddings.js";
import { AI_MODELS, EMBEDDING_FRESHNESS } from "../config/ai.js";
import { checkBudget, recordUsage } from "./aiUsage.js";
import type { DbOrTx } from "./workspaceLock.js";

export type EmbedOutcome = "embedded" | "unchanged" | "gone" | "trashed" | "over-budget";

export type EmbedResult = {
    outcome: EmbedOutcome;
    chunks?: number;
    inputTokens?: number;
};

/**
 * Covers title and content together, because the title is prepended to every
 * chunk before embedding. Hashing content alone would let a rename through and
 * leave every chunk carrying the old title.
 */
export function contentHash(title: string, content: string | null): string {
    return createHash("sha256")
        .update(`${title}\n${content ?? ""}`)
        .digest("hex");
}

/**
 * Brings one note's embeddings up to date. Safe to call from anywhere, as often
 * as you like — the hash check at the top makes a redundant call cost a read.
 *
 * The whole thing runs in one transaction with the note row locked FOR UPDATE,
 * which does mean holding a connection across the embedding API call. That is a
 * deliberate trade: it buys exact mutual exclusion, so no two processes ever
 * embed the same note concurrently, and at one worker doing serial batches the
 * pool pressure is nil. Revisit if embedding throughput ever matters.
 *
 * sourceUpdatedAt records the updatedAt seen at the start, not the time of
 * writing. If the note changed while the API call was in flight, its current
 * updatedAt is now ahead of what was recorded, so it reads as stale and gets
 * picked up again. Self-correcting, with no second read needed.
 */
export async function embedNote(noteId: string): Promise<EmbedResult> {
    return db.transaction(async (tx) => {
        const [row] = await tx
            .select({
                note: getColumns(schemas.note),
                ownerId: schemas.workspace.ownerId,
            })
            .from(schemas.note)
            .innerJoin(schemas.workspace, eq(schemas.workspace.id, schemas.note.workspaceId))
            .where(eq(schemas.note.id, noteId))
            .for("update", { of: schemas.note })
            .limit(1);

        if (!row) return { outcome: "gone" };

        const { note, ownerId } = row;

        // A trashed note keeps its chunks so a restore costs nothing; there is
        // nothing to re-embed while it sits in the bin.
        if (note.deletedAt) return { outcome: "trashed" };

        const [state] = await tx
            .select()
            .from(schemas.noteEmbeddingState)
            .where(eq(schemas.noteEmbeddingState.noteId, noteId))
            .limit(1);

        const hash = contentHash(note.title, note.content);

        // The text is already indexed — a move, a restore, or a save that
        // changed nothing. Mark it caught up and spend nothing.
        if (state && state.contentHash === hash) {
            await tx
                .update(schemas.noteEmbeddingState)
                .set({ sourceUpdatedAt: note.updatedAt })
                .where(eq(schemas.noteEmbeddingState.noteId, noteId));

            return { outcome: "unchanged" };
        }

        // Indexing is charged to the workspace owner rather than whoever typed.
        // The owner is always knowable from the note alone, which the background
        // worker needs, and the content is theirs.
        const budget = await checkBudget(ownerId, "embedding", tx);
        if (!budget.allowed) return { outcome: "over-budget" };

        const chunks = chunkNote(note.title, note.content);
        const { vectors, inputTokens } = await embedTexts(chunks);

        await tx.delete(schemas.noteChunk).where(eq(schemas.noteChunk.noteId, noteId));

        await tx.insert(schemas.noteChunk).values(
            chunks.map((content, index) => ({
                noteId,
                workspaceId: note.workspaceId,
                chunkIndex: index,
                content,
                embedding: vectors[index],
            })),
        );

        await tx
            .insert(schemas.noteEmbeddingState)
            .values({
                noteId,
                sourceUpdatedAt: note.updatedAt,
                contentHash: hash,
                chunkCount: chunks.length,
                embeddedAt: new Date(),
            })
            .onConflictDoUpdate({
                target: schemas.noteEmbeddingState.noteId,
                set: {
                    sourceUpdatedAt: note.updatedAt,
                    contentHash: hash,
                    chunkCount: chunks.length,
                    embeddedAt: new Date(),
                },
            });

        await recordUsage(
            {
                userId: ownerId,
                workspaceId: note.workspaceId,
                kind: "embedding",
                model: AI_MODELS.embedding,
                inputTokens,
                outputTokens: 0,
                noteId,
            },
            tx,
        );

        return { outcome: "embedded", chunks: chunks.length, inputTokens };
    });
}

/**
 * Live notes whose embeddings have fallen behind: never embedded, or written
 * since they were. Oldest first, so nothing starves behind a busy note.
 *
 * Deliberately takes no lock. A row lock only lives as long as its transaction,
 * and holding one open across a whole batch would serialise the embedding calls
 * it is meant to spread out. Mutual exclusion is embedNote's FOR UPDATE instead:
 * two workers may well select the same note, and the second simply waits, finds
 * the hash already current, and returns "unchanged" for the price of one read.
 */
export async function findStaleNoteIds(
    limit = EMBEDDING_FRESHNESS.workerBatchSize,
    executor: DbOrTx = db,
): Promise<string[]> {
    const rows = await executor
        .select({ id: schemas.note.id })
        .from(schemas.note)
        .leftJoin(
            schemas.noteEmbeddingState,
            eq(schemas.noteEmbeddingState.noteId, schemas.note.id),
        )
        .where(
            and(
                isNull(schemas.note.deletedAt),
                or(
                    isNull(schemas.noteEmbeddingState.noteId),
                    lt(schemas.noteEmbeddingState.sourceUpdatedAt, schemas.note.updatedAt),
                ),
            ),
        )
        .orderBy(asc(schemas.note.updatedAt))
        .limit(limit);

    return rows.map((row) => row.id);
}

/** How much is waiting, for the worker's log line and for tests. */
export async function countStaleNotes(executor: DbOrTx = db): Promise<number> {
    const [row] = await executor
        .select({ count: sql<number>`count(*)::int` })
        .from(schemas.note)
        .leftJoin(
            schemas.noteEmbeddingState,
            eq(schemas.noteEmbeddingState.noteId, schemas.note.id),
        )
        .where(
            and(
                isNull(schemas.note.deletedAt),
                or(
                    isNull(schemas.noteEmbeddingState.noteId),
                    lt(schemas.noteEmbeddingState.sourceUpdatedAt, schemas.note.updatedAt),
                ),
            ),
        );

    return row?.count ?? 0;
}
