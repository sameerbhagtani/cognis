import { and, asc, db, eq, gte, schemas, sum, type SQL } from "@cognis/database";

import { costMicros, SPEND_LIMITS } from "../config/ai.js";
import type { DbOrTx } from "./workspaceLock.js";

export type UsageKind = (typeof schemas.aiUsageKindEnum.enumValues)[number];

export type BudgetVerdict = {
    allowed: boolean;
    spentMicros: number;
    limitMicros: number;
    scope: "user" | "global";
};

function windowStart(): Date {
    return new Date(Date.now() - SPEND_LIMITS.windowHours * 60 * 60 * 1000);
}

/**
 * Summed per model, then priced in application code. Doing it this way keeps the
 * ledger free of money — a price change stays valid against old rows — while
 * still aggregating in the database, so the window never pulls every row into
 * memory. There are only a handful of models, so this returns a handful of rows.
 */
async function spentMicrosWhere(executor: DbOrTx, where: SQL | undefined): Promise<number> {
    const rows = await executor
        .select({
            model: schemas.aiUsage.model,
            inputTokens: sum(schemas.aiUsage.inputTokens),
            outputTokens: sum(schemas.aiUsage.outputTokens),
        })
        .from(schemas.aiUsage)
        .where(where)
        .groupBy(schemas.aiUsage.model);

    return rows.reduce(
        (total, row) =>
            total + costMicros(row.model, Number(row.inputTokens), Number(row.outputTokens)),
        0,
    );
}

/** What this user has spent on this kind of call inside the rolling window. */
export async function spentByUser(
    userId: string,
    kind: UsageKind,
    executor: DbOrTx = db,
): Promise<number> {
    return spentMicrosWhere(
        executor,
        and(
            eq(schemas.aiUsage.userId, userId),
            eq(schemas.aiUsage.kind, kind),
            gte(schemas.aiUsage.createdAt, windowStart()),
        ),
    );
}

/** What everyone together has spent inside the rolling window, across both kinds. */
export async function spentGlobally(executor: DbOrTx = db): Promise<number> {
    return spentMicrosWhere(executor, gte(schemas.aiUsage.createdAt, windowStart()));
}

async function limitFor(userId: string, kind: UsageKind, executor: DbOrTx): Promise<number> {
    const [override] = await executor
        .select()
        .from(schemas.userAiLimit)
        .where(eq(schemas.userAiLimit.userId, userId))
        .limit(1);

    const configured =
        kind === "completion" ? override?.chatDailyMicros : override?.indexingDailyMicros;

    // Each column is independently nullable, so an override of one budget leaves
    // the other on its default.
    if (configured !== null && configured !== undefined) return configured;

    return kind === "completion" ? SPEND_LIMITS.chatDailyMicros : SPEND_LIMITS.indexingDailyMicros;
}

/**
 * Checked before a paid call, never after. Returns a verdict rather than
 * throwing, because the two callers want different things from a refusal: a
 * chat request turns it into an HTTP status, while the embedding worker just
 * skips the note and moves on.
 *
 * The global ceiling is checked first. A per-user cap bounds one person; only
 * this bounds the bill.
 */
export async function checkBudget(
    userId: string,
    kind: UsageKind,
    executor: DbOrTx = db,
): Promise<BudgetVerdict> {
    const globalSpent = await spentGlobally(executor);

    if (globalSpent >= SPEND_LIMITS.globalDailyMicros) {
        return {
            allowed: false,
            spentMicros: globalSpent,
            limitMicros: SPEND_LIMITS.globalDailyMicros,
            scope: "global",
        };
    }

    const [spent, limit] = await Promise.all([
        spentByUser(userId, kind, executor),
        limitFor(userId, kind, executor),
    ]);

    return { allowed: spent < limit, spentMicros: spent, limitMicros: limit, scope: "user" };
}

/**
 * When the oldest spend in the window rolls off, freeing some allowance again.
 *
 * A rolling window has no reset time, so the honest answer to "when can I try
 * again" is when the earliest charge ages out — not the full window, which would
 * overstate the wait for someone who spent gradually.
 */
export async function nextBudgetReleaseAt(
    userId: string,
    kind: UsageKind,
    executor: DbOrTx = db,
): Promise<Date | null> {
    const [row] = await executor
        .select({ createdAt: schemas.aiUsage.createdAt })
        .from(schemas.aiUsage)
        .where(
            and(
                eq(schemas.aiUsage.userId, userId),
                eq(schemas.aiUsage.kind, kind),
                gte(schemas.aiUsage.createdAt, windowStart()),
            ),
        )
        .orderBy(asc(schemas.aiUsage.createdAt))
        .limit(1);

    if (!row) return null;

    return new Date(row.createdAt.getTime() + SPEND_LIMITS.windowHours * 60 * 60 * 1000);
}

export type UsageRecord = {
    userId: string;
    workspaceId: string | null;
    kind: UsageKind;
    model: string;
    inputTokens: number;
    outputTokens: number;
    messageId?: string | null;
    noteId?: string | null;
};

/**
 * Written after the call returns, from the counts the API itself reported.
 * Estimating here would mean the ledger and the invoice disagree.
 */
export async function recordUsage(record: UsageRecord, executor: DbOrTx = db) {
    await executor.insert(schemas.aiUsage).values({
        userId: record.userId,
        workspaceId: record.workspaceId,
        kind: record.kind,
        model: record.model,
        inputTokens: record.inputTokens,
        outputTokens: record.outputTokens,
        messageId: record.messageId ?? null,
        noteId: record.noteId ?? null,
    });
}

/** Exposed for GET /me/ai-usage, and for the worker's shutdown summary. */
export async function usageSummary(userId: string) {
    const [chat, indexing, global] = await Promise.all([
        checkBudget(userId, "completion"),
        checkBudget(userId, "embedding"),
        spentGlobally(),
    ]);

    return {
        chat: { spentMicros: chat.spentMicros, limitMicros: chat.limitMicros },
        indexing: { spentMicros: indexing.spentMicros, limitMicros: indexing.limitMicros },
        global: { spentMicros: global, limitMicros: SPEND_LIMITS.globalDailyMicros },
        windowHours: SPEND_LIMITS.windowHours,
        resetsAt: new Date(Date.now() + SPEND_LIMITS.windowHours * 60 * 60 * 1000),
    };
}
