import { Server } from "socket.io";
import { z } from "zod";

import { workspaceRoom } from "./events.js";
import { setSocketServer } from "./emitter.js";

import { auth } from "../lib/auth.js";
import env from "../shared/config/env.js";
import { getWorkspaceMembership } from "../shared/services/workspaceAccess.js";

import type { Server as HttpServer } from "node:http";

type RoomAck = (result: { ok: boolean; error?: string }) => void;

const workspaceIdSchema = z.guid();

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

        socket.data.userId = session.user.id;
        next();
    });

    io.on("connection", (socket) => {
        // Membership is re-checked here rather than trusted from the client: the
        // room is the only thing gating what this socket receives, viewers
        // included.
        socket.on(
            "workspace:join",
            handleRoomRequest("workspace:join", async (workspaceId) => {
                const membership = await getWorkspaceMembership(workspaceId, socket.data.userId);
                if (!membership) return { ok: false, error: "Workspace not found" };

                await socket.join(workspaceRoom(workspaceId));

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
