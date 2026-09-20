import { getChatForUser, type Chat } from "./service.js";

import { maxOutputTokensFor } from "../../lib/ai/chat.js";
import { CHAT } from "../../shared/config/ai.js";
import { checkBudget, nextBudgetReleaseAt } from "../../shared/services/aiUsage.js";
import ApiError from "../../shared/utils/ApiError.js";
import parseUuidParam from "../../shared/utils/parseUuidParam.js";

import type { NextFunction, Request, Response } from "express";

export function chatOf(req: Request): Chat {
    if (!req.chat) throw ApiError.internal("Chat access guard did not run");

    return req.chat;
}

/**
 * /chats/:chatId carries no workspaceId, so both checks come off the chat row.
 *
 * Ownership and membership are checked together, not one instead of the other.
 * A chat is private to whoever made it, and it also lives inside a workspace —
 * so being removed from that workspace takes the chats with it, even though the
 * rows remain.
 *
 * A chat that does not exist and a chat belonging to someone else are both 404,
 * so the id space is not probeable. There is no 403 here: a chat you do not own
 * is not a permissions problem, it is none of your business.
 */
export default async function requireChatAccess(
    req: Request<{ chatId: string }>,
    _res: Response,
    next: NextFunction,
) {
    const row = await getChatForUser(parseUuidParam(req.params.chatId, "chatId"), req.user.id);

    if (!row || row.chat.userId !== req.user.id) throw ApiError.notFound("Chat not found");

    req.chat = row.chat;

    next();
}

/**
 * Refuses before anything is spent. Two ceilings apply, and they fail
 * differently on purpose: a personal allowance is the caller's to wait out,
 * while the global one is everyone's problem and should not read as the user's
 * fault.
 *
 * A rolling window has no reset time, so the retry hint is when this caller's
 * oldest charge ages out — the moment some allowance genuinely returns.
 */
export async function requireChatBudget(req: Request, res: Response, next: NextFunction) {
    const verdict = await checkBudget(req.user.id, "completion");

    // Not just "is there anything left", but "is there enough left to be worth
    // spending". A few micro-dollars buys an answer of a few tokens, which comes
    // back empty or cut mid-word after the input has already been paid for.
    const affordableOutput = maxOutputTokensFor(
        Math.max(0, verdict.limitMicros - verdict.spentMicros),
    );

    if (verdict.allowed && affordableOutput >= CHAT.minOutputTokens) return next();

    if (verdict.scope === "global") {
        throw ApiError.tooManyRequests(
            "AI features are temporarily unavailable — the daily limit for everyone has been reached",
        );
    }

    const releaseAt = await nextBudgetReleaseAt(req.user.id, "completion");

    if (releaseAt) {
        const seconds = Math.max(1, Math.ceil((releaseAt.getTime() - Date.now()) / 1000));
        res.setHeader("Retry-After", String(seconds));
    }

    throw ApiError.tooManyRequests("You have used your AI allowance for now");
}
