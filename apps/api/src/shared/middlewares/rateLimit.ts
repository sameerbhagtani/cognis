import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";

import { RATE_LIMITS, rateLimitEnabled } from "../config/rateLimit.js";
import ApiError from "../utils/ApiError.js";

import type { NextFunction, Request, Response } from "express";

const limiters = {
    ip: new RateLimiterMemory(RATE_LIMITS.ip),
    user: new RateLimiterMemory(RATE_LIMITS.user),
    noteUpdate: new RateLimiterMemory(RATE_LIMITS.noteUpdate),
    workspaceWrite: new RateLimiterMemory(RATE_LIMITS.workspaceWrite),
    memberInvite: new RateLimiterMemory(RATE_LIMITS.memberInvite),
};

/**
 * rate-limiter-flexible signals a rejected request by rejecting with a
 * RateLimiterRes rather than throwing an Error, so a bare await would surface a
 * limit hit as an unrecognised failure and land on the 500 branch.
 *
 * Anything that really is an Error is a fault in the limiter itself and is
 * rethrown untouched.
 */
export async function consumeRateLimit(
    res: Response,
    limiter: RateLimiterMemory,
    key: string,
    message: string,
) {
    if (!rateLimitEnabled) return;

    try {
        await limiter.consume(key);
    } catch (err) {
        if (err instanceof Error) throw err;

        const retryAfterSeconds = Math.ceil((err as RateLimiterRes).msBeforeNext / 1000);
        res.setHeader("Retry-After", String(retryAfterSeconds));

        throw ApiError.tooManyRequests(message);
    }
}

/**
 * Runs ahead of authentication, so it can only key on the address. Express reports
 * the socket's peer, which behind a proxy is the proxy itself unless `trust proxy`
 * is configured — every client would then share one bucket.
 */
export async function rateLimitByIp(req: Request, res: Response, next: NextFunction) {
    await consumeRateLimit(res, limiters.ip, req.ip ?? "unknown", "Too many requests");

    next();
}

/** Runs after requireAuth, so the session identifies the caller rather than the network. */
export async function rateLimitByUser(req: Request, res: Response, next: NextFunction) {
    await consumeRateLimit(res, limiters.user, req.user.id, "Too many requests");

    next();
}

export async function rateLimitNoteUpdate(req: Request, res: Response, next: NextFunction) {
    await consumeRateLimit(
        res,
        limiters.noteUpdate,
        req.user.id,
        "Too many note updates, slow down",
    );

    next();
}

/**
 * Keyed by user and workspace together: one busy workspace shouldn't spend a
 * user's budget everywhere else, and one user shouldn't be able to monopolise a
 * workspace's lock.
 *
 * Mounted after the resource guard, which is where the workspace becomes known.
 */
export function rateLimitWorkspaceWrite(getWorkspaceId: (req: Request) => string | undefined) {
    return async function workspaceWriteLimiter(req: Request, res: Response, next: NextFunction) {
        const workspaceId = getWorkspaceId(req);

        if (workspaceId) {
            await consumeRateLimit(
                res,
                limiters.workspaceWrite,
                `${req.user.id}:${workspaceId}`,
                "Too many changes to this workspace, slow down",
            );
        }

        next();
    };
}

/**
 * Keyed by the address being written to, not the account doing the writing, so
 * repeatedly adding and removing someone can't be used to fill their inbox.
 *
 * The key comes from the caller rather than being read off the body here, so it
 * is the same normalized address the handler looks the user up by. Deriving it in
 * both places is how the two drifted apart: this one lowercased, the lookup
 * didn't, and an invite typed with a capital letter was limited under one key and
 * queried under another.
 */
export function rateLimitMemberInvite(getEmail: (req: Request) => string | undefined) {
    return async function memberInviteLimiter(req: Request, res: Response, next: NextFunction) {
        const email = getEmail(req);

        if (email) {
            await consumeRateLimit(
                res,
                limiters.memberInvite,
                email,
                "This address has been invited too many times recently",
            );
        }

        next();
    };
}
