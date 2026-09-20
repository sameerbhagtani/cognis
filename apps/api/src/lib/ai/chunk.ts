import { CHUNKING } from "../../shared/config/ai.js";

export function estimateTokens(text: string): number {
    return Math.ceil(text.length / CHUNKING.charsPerToken);
}

/**
 * Tried in order, largest natural boundary first. Splitting on paragraphs keeps
 * a chunk about one idea; falling through to sentences, then words, then raw
 * characters guarantees termination on text with no structure at all.
 */
const SEPARATORS = ["\n\n", "\n", ". ", " "];

/** Breaks text down until every piece fits, preferring the coarsest boundary. */
function toPieces(text: string, maxChars: number, depth = 0): string[] {
    if (text.length <= maxChars) return [text];

    const separator = SEPARATORS[depth];

    // Out of separators: a single unbroken run longer than a chunk. Hard-wrap it.
    if (separator === undefined) {
        const pieces: string[] = [];

        for (let i = 0; i < text.length; i += maxChars) pieces.push(text.slice(i, i + maxChars));

        return pieces;
    }

    return text
        .split(separator)
        .filter((part) => part.length > 0)
        .flatMap((part) => toPieces(part, maxChars, depth + 1));
}

/**
 * The tail of the previous chunk, carried into the next one so a sentence split
 * across the boundary is still retrievable from either side. Snapped to a word
 * boundary, since half a word embeds as noise.
 */
function overlapTail(chunk: string, overlapChars: number): string {
    if (overlapChars <= 0 || chunk.length <= overlapChars) return chunk;

    const tail = chunk.slice(-overlapChars);
    const boundary = tail.indexOf(" ");

    return boundary === -1 ? tail : tail.slice(boundary + 1);
}

function pack(pieces: string[], maxChars: number, overlapChars: number): string[] {
    const chunks: string[] = [];
    let current = "";

    for (const piece of pieces) {
        if (current && current.length + piece.length + 1 > maxChars) {
            chunks.push(current);

            // Carry the overlap only when the next piece still fits beside it.
            // A piece that is already chunk-sized — unbroken text that had to be
            // hard-wrapped — would otherwise push the chunk past its budget.
            const tail = overlapTail(current, overlapChars);
            current = tail.length + piece.length + 1 <= maxChars ? tail : "";
        }

        current = current ? `${current}\n${piece}` : piece;
    }

    if (current.trim()) chunks.push(current);

    return chunks;
}

/**
 * Splits a note into the chunks that get embedded.
 *
 * The title is prepended to every chunk. A chunk reading "we decided to use an
 * advisory lock" is far easier to find when its vector also carries
 * "Concurrency notes", and without it a chunk from the middle of a note has no
 * idea what it belongs to.
 *
 * A note with a title and no body still produces one chunk, so an empty note is
 * findable by its name rather than invisible.
 */
export function chunkNote(title: string, content: string | null): string[] {
    const prefix = `${title}\n\n`;
    const body = content?.trim() ?? "";

    if (!body) return [title];

    // The prefix rides on every chunk, so it comes out of the chunk's budget.
    const maxChars = Math.max(
        CHUNKING.targetTokens * CHUNKING.charsPerToken - prefix.length,
        CHUNKING.charsPerToken * 50,
    );
    const overlapChars = CHUNKING.overlapTokens * CHUNKING.charsPerToken;

    return pack(toPieces(body, maxChars), maxChars, overlapChars)
        .slice(0, CHUNKING.maxChunksPerNote)
        .map((chunk) => `${prefix}${chunk}`);
}
