import { EMBEDDING_FRESHNESS } from "../shared/config/ai.js";
import {
    countStaleNotes,
    embedNote,
    findStaleNoteIds,
    type EmbedOutcome,
} from "../shared/services/noteEmbedding.js";

/**
 * The durable half of keeping embeddings fresh, and the only part that is a
 * guarantee. The API's in-process debounce is an optimisation that a restart
 * erases; this is what eventually embeds anything it dropped.
 *
 * Unlike the trash purge, this is a long-running loop rather than a one-shot on
 * a schedule, because staleness is continuous rather than daily. On a container
 * platform it is a second always-on service.
 *
 *   node dist/jobs/embedNotes.js
 *
 * Run one. A second is safe — embedNote locks the note row and the content hash
 * makes a duplicate attempt free — but it only adds contention, no throughput.
 *
 * Backfill needs nothing special: a note that has never been embedded has no
 * state row, which makes it stale by definition, so the first run picks up
 * everything written before this existed.
 */

let running = true;

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tick(): Promise<Record<EmbedOutcome, number>> {
    const counts: Record<EmbedOutcome, number> = {
        embedded: 0,
        unchanged: 0,
        gone: 0,
        trashed: 0,
        "over-budget": 0,
    };

    const noteIds = await findStaleNoteIds();

    for (const noteId of noteIds) {
        if (!running) break;

        const result = await embedNote(noteId);
        counts[result.outcome] += 1;
    }

    return counts;
}

async function main() {
    const pending = await countStaleNotes();
    console.log(`embedding worker started — ${pending} note(s) stale`);

    while (running) {
        try {
            const counts = await tick();

            if (counts.embedded > 0 || counts["over-budget"] > 0) {
                console.log(
                    `embedded ${counts.embedded}, unchanged ${counts.unchanged}, ` +
                        `skipped ${counts.trashed + counts.gone}` +
                        (counts["over-budget"] > 0 ? `, over budget ${counts["over-budget"]}` : ""),
                );
            }

            // Backing off when the budget is gone keeps this from spinning
            // through the same notes every poll until the window rolls.
            const idle = counts["over-budget"] > 0;
            await sleep(
                idle ? EMBEDDING_FRESHNESS.workerPollMs * 10 : EMBEDDING_FRESHNESS.workerPollMs,
            );
        } catch (err) {
            // A failed tick must not end the worker: an API outage should pause
            // indexing, not stop it permanently with nothing watching.
            console.error("embedding tick failed", err);
            await sleep(EMBEDDING_FRESHNESS.workerPollMs * 4);
        }
    }

    console.log("embedding worker stopped");
    process.exit(0);
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
        // Finishes the note in flight rather than abandoning a paid API call
        // whose result would then be thrown away.
        console.log(`${signal} received, finishing current note`);
        running = false;
    });
}

main().catch((err) => {
    console.error("embedding worker failed", err);
    process.exit(1);
});
