import { Server } from "socket.io";
import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import { z } from "zod";

import { chatRoom, workspaceRoom } from "./events.js";
import { setSocketServer } from "./emitter.js";

import { auth } from "../lib/auth.js";
import env from "../shared/config/env.js";
import { RATE_LIMITS, rateLimitEnabled } from "../shared/config/rateLimit.js";
import { getWorkspaceMembership } from "../shared/services/workspaceAccess.js";
import { getChatForUser } from "../modules/chat/service.js";

import type { Server as HttpServer } from "node:http";

type RoomAck = (result: { ok: boolean; error?: string }) => void;

const workspaceIdSchema = z.guid();

const joinLimiter = new RateLimiterMemory(RATE_LIMITS.wsJoin);

/**
 * Sockets held per user, so one account can't open connections without bound. A
 * gauge rather than a rate, which is why it is a plain count instead of a
 * limiter.
 */
const socketsPerUser = new Map<string, number>();

function claimConnection(userId: string) {
    const current = socketsPerUser.get(userId) ?? 0;
    if (rateLimitEnabled && current >= RATE_LIMITS.wsConnections) return false;

    socketsPerUser.set(userId, current + 1);

    return true;
}

function releaseConnection(userId: string) {
    const next = (socketsPerUser.get(userId) ?? 1) - 1;

    if (next <= 0) socketsPerUser.delete(userId);
    else socketsPerUser.set(userId, next);
}

/**
 * socket.io has no equivalent of Express's error middleware: a rejected handler
 * becomes an unhandled rejection, which can take the process down. Every handler
 * answers through the ack instead of throwing.
 */
function handleRoomRequest(
    name: string,
    run: (workspaceId: string) => Promise<{ ok: boolean; error?: string }>,
) {
    return async (rawWorkspaceId: unknown, ack?: RoomAck) => {
        const parsed = workspaceIdSchema.safeParse(rawWorkspaceId);
        if (!parsed.success) return ack?.({ ok: false, error: "Invalid workspaceId" });

        try {
            ack?.(await run(parsed.data));
        } catch (err) {
            console.error(`socket ${name} failed`, err);
            ack?.({ ok: false, error: "Internal error" });
        }
    };
}

export function createSocketServer(httpServer: HttpServer) {
    const io = new Server(httpServer, {
        cors: { origin: env.CLIENT_URL, credentials: true },
    });

    // Same session check as REST, reading the cookie off the handshake. Rejecting
    // here means an unauthenticated socket never reaches a room.
    io.use(async (socket, next) => {
        const session = await auth.api.getSession({
            headers: new Headers({ cookie: socket.handshake.headers.cookie ?? "" }),
        });

        if (!session) return next(new Error("Unauthorized"));

        // Refused during the handshake rather than after connecting: a socket that
        // connects and is then dropped looks like a network failure, and the client
        // reconnects straight into the same wall. A connect_error carries a reason
        // the client can act on.
        if (!claimConnection(session.user.id)) {
            return next(new Error("Too many open connections"));
        }

        socket.data.userId = session.user.id;
        next();
    });

    io.on("connection", (socket) => {
        // Claimed in the handshake above, so every connected socket holds exactly
        // one slot and releases it here.
        socket.on("disconnect", () => releaseConnection(socket.data.userId));

        // Membership is re-checked here rather than trusted from the client: the
        // room is the only thing gating what this socket receives, viewers
        // included.
        socket.on(
            "workspace:join",
            handleRoomRequest("workspace:join", async (workspaceId) => {
                // Each join costs a membership lookup, so the spam guard sits ahead
                // of the query rather than after it.
                if (rateLimitEnabled) {
                    try {
                        await joinLimiter.consume(socket.id);
                    } catch (err) {
                        if (err instanceof Error) throw err;

                        const retryAfter = Math.ceil((err as RateLimiterRes).msBeforeNext / 1000);

                        return { ok: false, error: `Too many joins, retry in ${retryAfter}s` };
                    }
                }

                const membership = await getWorkspaceMembership(workspaceId, socket.data.userId);
                if (!membership) return { ok: false, error: "Workspace not found" };

                await socket.join(workspaceRoom(workspaceId));

                return { ok: true };
            }),
        );

        // Same shape as workspace:join, and checked just as hard. A chat is
        // private to whoever made it, so the room is gated on ownership as well
        // as on still belonging to the workspace it lives in.
        socket.on(
            "chat:join",
            handleRoomRequest("chat:join", async (chatId) => {
                if (rateLimitEnabled) {
                    try {
                        await joinLimiter.consume(socket.id);
                    } catch (err) {
                        if (err instanceof Error) throw err;

                        const retryAfter = Math.ceil((err as RateLimiterRes).msBeforeNext / 1000);

                        return { ok: false, error: `Too many joins, retry in ${retryAfter}s` };
                    }
                }

                const row = await getChatForUser(chatId, socket.data.userId);
                if (!row || row.chat.userId !== socket.data.userId) {
                    return { ok: false, error: "Chat not found" };
                }

                await socket.join(chatRoom(chatId));

                return { ok: true };
            }),
        );

        socket.on(
            "chat:leave",
            handleRoomRequest("chat:leave", async (chatId) => {
                await socket.leave(chatRoom(chatId));

                return { ok: true };
            }),
        );

        socket.on(
            "workspace:leave",
            handleRoomRequest("workspace:leave", async (workspaceId) => {
                await socket.leave(workspaceRoom(workspaceId));

                return { ok: true };
            }),
        );
    });

    setSocketServer(io);

    return io;
}
