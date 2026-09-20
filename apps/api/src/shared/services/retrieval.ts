import { and, asc, cosineDistance, db, desc, eq, isNull, schemas, sql } from "@cognis/database";

import { estimateTokens } from "../../lib/ai/chunk.js";
import { condenseQuestion } from "../../lib/ai/condense.js";
import { embedTexts } from "../../lib/ai/embeddings.js";
import type { HistoryTurn } from "../../lib/ai/prompt.js";
import { AI_MODELS, RETRIEVAL } from "../config/ai.js";
import { recordUsage } from "./aiUsage.js";
import type { DbOrTx } from "./workspaceLock.js";

export type NoteIndexEntry = {
    id: string;
    title: string;
    updatedAt: Date;
};

export type ContextSource = {
    noteId: string;
    title: string;
    content: string;
    /** Absent on the inline path, where nothing was ranked. */
    distance?: number;
};

export type ContextStrategy = "inline" | "retrieved";

export type WorkspaceContext = {
    strategy: ContextStrategy;
    noteIndex: NoteIndexEntry[];
    noteIndexTruncated: boolean;
    sources: ContextSource[];
    citedNoteIds: string[];
    /** Tokens spent embedding the question. Zero on the inline path. */
    queryInputTokens: number;
    /** What was actually searched with, once a follow-up has been resolved. */
    searchQuery?: string;
    searchQueryRewritten: boolean;
};

/**
 * The retrieval query, and the only place note_chunk is ever read.
 *
 * Two conditions carry the whole feature's safety. `workspaceId` is the tenant
 * boundary: without it, another workspace's notes end up in someone's answer and
 * nothing errors — the model simply, quietly knows things it should not.
 * `deletedAt IS NULL` is what lets chunks survive a soft delete, so trashing a
 * note hides it instantly and restoring it costs no re-embedding.
 *
 * Kept private on purpose. Callers go through buildWorkspaceContext, so neither
 * condition can be forgotten at a call site.
 */
async function retrieveChunks(
    workspaceId: string,
    queryVector: number[],
    limit: number,
    executor: DbOrTx,
): Promise<ContextSource[]> {
    const distance = cosineDistance(schemas.noteChunk.embedding, queryVector);

    const rows = await executor
        .select({
            noteId: schemas.noteChunk.noteId,
            title: schemas.note.title,
            content: schemas.noteChunk.content,
            distance,
        })
        .from(schemas.noteChunk)
        .innerJoin(schemas.note, eq(schemas.note.id, schemas.noteChunk.noteId))
        .where(and(eq(schemas.noteChunk.workspaceId, workspaceId), isNull(schemas.note.deletedAt)))
        .orderBy(distance)
        .limit(limit);

    return rows.map((row) => ({ ...row, distance: Number(row.distance) }));
}

/**
 * Every live note's name, sent with every request whatever the strategy.
 *
 * This is cheap — titles are capped at 50 characters — and it fixes the most
 * irritating failure of pure search: being told "I don't see anything about
 * that" when a note plainly exists but did not rank. With the index present the
 * model can say "you have a note called Deployment checklist, shall I read it?"
 *
 * Most recently updated first, so a ceiling on a huge workspace drops the notes
 * least likely to be asked about.
 */
export async function buildNoteIndex(
    workspaceId: string,
    executor: DbOrTx = db,
): Promise<{ entries: NoteIndexEntry[]; truncated: boolean }> {
    const entries = await executor
        .select({
            id: schemas.note.id,
            title: schemas.note.title,
            updatedAt: schemas.note.updatedAt,
        })
        .from(schemas.note)
        .where(and(eq(schemas.note.workspaceId, workspaceId), isNull(schemas.note.deletedAt)))
        .orderBy(desc(schemas.note.updatedAt))
        .limit(RETRIEVAL.noteIndexLimit + 1);

    const truncated = entries.length > RETRIEVAL.noteIndexLimit;

    return { entries: entries.slice(0, RETRIEVAL.noteIndexLimit), truncated };
}

/**
 * Rough size of everything live in the workspace, used only to choose a
 * strategy. Measured in the database so a large workspace is never loaded into
 * memory just to discover it is too large to send.
 */
export async function estimateWorkspaceTokens(
    workspaceId: string,
    executor: DbOrTx = db,
): Promise<number> {
    const [row] = await executor
        .select({
            chars: sql<number>`COALESCE(SUM(LENGTH(${schemas.note.title}) + COALESCE(LENGTH(${schemas.note.content}), 0)), 0)::int`,
        })
        .from(schemas.note)
        .where(and(eq(schemas.note.workspaceId, workspaceId), isNull(schemas.note.deletedAt)));

    return estimateTokens("x".repeat(row?.chars ?? 0));
}

/** Whole live notes, for the inline path. Ordered for stable prompt prefixes. */
async function loadAllNotes(workspaceId: string, executor: DbOrTx): Promise<ContextSource[]> {
    const rows = await executor
        .select({
            noteId: schemas.note.id,
            title: schemas.note.title,
            content: schemas.note.content,
        })
        .from(schemas.note)
        .where(and(eq(schemas.note.workspaceId, workspaceId), isNull(schemas.note.deletedAt)))
        .orderBy(asc(schemas.note.id));

    return rows.map((row) => ({
        noteId: row.noteId,
        title: row.title,
        content: row.content ?? "",
    }));
}

type BuildContextInput = {
    workspaceId: string;
    /** Charged for the question's embedding on the retrieved path. */
    userId: string;
    question: string;
    /** Earlier turns, used to resolve a follow-up before searching. */
    history?: HistoryTurn[];
    executor?: DbOrTx;
};

/**
 * Chooses a strategy and gathers what the model will read.
 *
 * Small workspaces are sent whole: no ranking means no chance of retrieving the
 * wrong thing, and broad questions — "summarise what I worked on" — are answered
 * properly rather than from six fragments. Past the threshold that becomes too
 * expensive per message, and search takes over.
 *
 * Embedding the question is recorded in the ledger but is deliberately not
 * gated on the indexing budget. A question costs well under a micro-dollar, and
 * refusing to chat because a day of heavy writing used up the indexing
 * allowance would be a baffling way to fail. The chat budget and the global
 * ceiling are what gate a chat, and they are checked by the caller.
 */
export async function buildWorkspaceContext({
    workspaceId,
    userId,
    question,
    history = [],
    executor = db,
}: BuildContextInput): Promise<WorkspaceContext> {
    const [{ entries, truncated }, workspaceTokens] = await Promise.all([
        buildNoteIndex(workspaceId, executor),
        estimateWorkspaceTokens(workspaceId, executor),
    ]);

    if (workspaceTokens <= RETRIEVAL.inlineThresholdTokens) {
        const sources = await loadAllNotes(workspaceId, executor);

        return {
            strategy: "inline",
            noteIndex: entries,
            noteIndexTruncated: truncated,
            sources,
            citedNoteIds: [...new Set(sources.map((source) => source.noteId))],
            queryInputTokens: 0,
            searchQueryRewritten: false,
        };
    }

    // Only here, and only with history to resolve. On the inline path above
    // every note is already in context, so there is nothing a better query
    // could improve and no reason to pay for one.
    const condensed = await condenseQuestion(history, question);

    if (condensed.inputTokens > 0 || condensed.outputTokens > 0) {
        await recordUsage(
            {
                userId,
                workspaceId,
                kind: "completion",
                model: AI_MODELS.chat,
                inputTokens: condensed.inputTokens,
                outputTokens: condensed.outputTokens,
            },
            executor,
        );
    }

    const { vectors, inputTokens } = await embedTexts([condensed.question]);

    await recordUsage(
        {
            userId,
            workspaceId,
            kind: "embedding",
            model: AI_MODELS.embedding,
            inputTokens,
            outputTokens: 0,
        },
        executor,
    );

    const sources = await retrieveChunks(workspaceId, vectors[0], RETRIEVAL.topK, executor);

    return {
        strategy: "retrieved",
        noteIndex: entries,
        noteIndexTruncated: truncated,
        sources,
        citedNoteIds: [...new Set(sources.map((source) => source.noteId))],
        queryInputTokens: inputTokens,
        searchQuery: condensed.question,
        searchQueryRewritten: condensed.rewritten,
    };
}
