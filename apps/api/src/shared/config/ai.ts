/**
 * Every AI number in one place, the way RATE_LIMITS already is.
 *
 * Model ids are constants rather than environment variables. The embedding model
 * cannot be one: its output dimension is fixed in the note_chunk column type, so
 * changing it means a migration and a full re-embed. Keeping the chat model
 * beside it means both are read and changed in the same diff, rather than
 * drifting per environment without anyone noticing.
 */
export const AI_MODELS = {
    chat: "gpt-5.6-luna",
    embedding: "text-embedding-3-small",
} as const;

/**
 * Micro-dollars per million tokens — $0.20/MTok is 200_000. Integers all the way
 * down, so repeated addition cannot drift the way a float would.
 *
 * Spend is derived from these at read time rather than stored, so a price change
 * leaves the ledger's raw token counts valid.
 */
export const MODEL_PRICES: Record<string, { input: number; output: number }> = {
    [AI_MODELS.chat]: { input: 200_000, output: 1_200_000 },
    [AI_MODELS.embedding]: { input: 20_000, output: 0 },
};

/** Rounded up, so rounding never works in the caller's favour. */
export function costMicros(model: string, inputTokens: number, outputTokens: number): number {
    const price = MODEL_PRICES[model];

    if (!price) throw new Error(`No price configured for model "${model}"`);

    return Math.ceil((inputTokens * price.input + outputTokens * price.output) / 1_000_000);
}

export const CHUNKING = {
    targetTokens: 800,
    overlapTokens: 120,

    /** A pasted book should not quietly cost a fortune to index. */
    maxChunksPerNote: 200,

    /**
     * Tokens are estimated from character count rather than with a real
     * tokeniser. This only ever feeds threshold decisions, never billing — the
     * ledger records the counts the API itself reports — so a rough divisor beats
     * a WASM dependency.
     */
    charsPerToken: 4,
} as const;

export const EMBEDDING_FRESHNESS = {
    /** Embed once typing stops, not once per keystroke. */
    debounceMs: 5_000,

    /**
     * And never more than once a minute for one note, whatever the typing
     * pattern. The debounce handles the common case; this bounds the worst one,
     * where someone pauses to think just longer than the debounce window over and
     * over.
     */
    floorMs: 60_000,

    workerPollMs: 15_000,
    workerBatchSize: 20,
} as const;

/**
 * Daily spend ceilings in micro-dollars, over a rolling window rather than a
 * calendar day — a fixed window would let the whole allowance be spent either
 * side of midnight, which on a small balance is double the intended amount.
 */
export const SPEND_LIMITS = {
    chatDailyMicros: 10_000,
    indexingDailyMicros: 5_000,

    /**
     * Per-user caps bound one person, not the bill. This bounds total exposure,
     * so a rush of signups or a retry loop cannot drain the account.
     */
    globalDailyMicros: 500_000,

    windowHours: 24,
} as const;
