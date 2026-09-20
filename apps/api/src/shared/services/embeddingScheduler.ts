import { EMBEDDING_FRESHNESS } from "../config/ai.js";
import { createDebouncer } from "../utils/debounce.js";
import { embedNote } from "./noteEmbedding.js";

/**
 * The in-process half of keeping embeddings fresh. It exists for latency: a note
 * you just wrote becomes searchable in seconds rather than at the worker's next
 * poll.
 *
 * It is never the guarantee. Timers live in memory, so a restart loses them and
 * a second API instance cannot see the first one's, which is what the worker is
 * for. Nothing here may throw into the request that scheduled it.
 */
const debouncer = createDebouncer({
    waitMs: EMBEDDING_FRESHNESS.debounceMs,
    floorMs: EMBEDDING_FRESHNESS.floorMs,
    run: async (noteId) => {
        const result = await embedNote(noteId);

        if (result.outcome === "over-budget") {
            console.warn(`note ${noteId} not embedded: indexing budget exhausted`);
        }
    },
    onError: (noteId, error) => console.error(`failed to embed note ${noteId}`, error),
});

/**
 * Called after a write commits, never inside the transaction — scheduling from
 * inside one would queue work for a change a rollback then erases.
 *
 * Only worth calling when the title or body changed. A move alters no embedded
 * text, and the hash check would spend a read proving it.
 */
export function scheduleNoteEmbedding(noteId: string) {
    debouncer.schedule(noteId);
}

export function pendingEmbeddings() {
    return debouncer.pending();
}
