/**
 * Spend is tracked in micros - millionths of a dollar - because the per-call
 * costs are far below a cent and rounding them to currency would lose the
 * ledger's precision.
 */
export type SpendBucket = {
    spentMicros: number;
    limitMicros: number;
};

export type AiUsage = {
    chat: SpendBucket;
    indexing: SpendBucket;
    global: SpendBucket;
    windowHours: number;
    resetsAt: string;
};
