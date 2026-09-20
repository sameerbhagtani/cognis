import {
    pgTable,
    uuid,
    text,
    integer,
    timestamp,
    index,
    unique,
    vector,
} from "drizzle-orm/pg-core";

import { note } from "./note.js";
import { workspace } from "./workspace.js";

/**
 * Fixed by the embedding model (text-embedding-3-small). Baked into the column
 * type, so switching models means a migration and a full re-embed — exported so
 * the API can assert it matches the model it is configured with.
 */
export const EMBEDDING_DIMENSIONS = 1536;

/**
 * A slice of a note, with its embedding.
 *
 * Chunks deliberately survive a soft delete. ON DELETE CASCADE only fires on a
 * real DELETE, and trashing a note is an UPDATE, so retrieval filters on
 * note.deletedAt instead and restoring a note costs nothing. The purge job's
 * hard delete is what finally removes them.
 *
 * workspaceId is denormalised off note so the retrieval filter — the line that
 * must never be missing — is a condition on this table rather than something
 * only a join can enforce.
 */
export const noteChunk = pgTable(
    "note_chunk",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        noteId: uuid("note_id")
            .notNull()
            .references(() => note.id, { onDelete: "cascade" }),
        workspaceId: uuid("workspace_id")
            .notNull()
            .references(() => workspace.id, { onDelete: "cascade" }),

        chunkIndex: integer("chunk_index").notNull(),
        content: text("content").notNull(),
        embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }).notNull(),

        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        index("note_chunk_workspaceId_idx").on(table.workspaceId),
        // Cosine, matching how the embeddings are compared at query time. An
        // index built for one distance operator does not serve another.
        index("note_chunk_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
        unique("note_chunk_noteId_chunkIndex_unique").on(table.noteId, table.chunkIndex),
    ],
);

/**
 * How far a note's embeddings have caught up with its content.
 *
 * A separate table rather than columns on note, because note.updatedAt bumps
 * itself on every write: recording "this note is embedded" would bump it and
 * make the note look stale again, re-embedding forever.
 *
 * contentHash covers title *and* content, since the title is prepended to each
 * chunk before embedding — hashing content alone would let a rename through and
 * leave every chunk carrying the old title.
 */
export const noteEmbeddingState = pgTable("note_embedding_state", {
    noteId: uuid("note_id")
        .primaryKey()
        .references(() => note.id, { onDelete: "cascade" }),

    sourceUpdatedAt: timestamp("source_updated_at").notNull(),
    contentHash: text("content_hash").notNull(),
    chunkCount: integer("chunk_count").notNull(),

    embeddedAt: timestamp("embedded_at").defaultNow().notNull(),
});
