import { io, type Socket } from "socket.io-client";

import { authClient } from "@/lib/auth";

type RoomAck = { ok: boolean; error?: string };

let socket: Socket | null = null;
let connecting: Promise<Socket> | null = null;

/**
 * `extraHeaders` only reaches the wire on React Native — engine.io-client
 * detects the environment and passes it straight into RN's WebSocket
 * `headers` option, something a browser's WebSocket API has no equivalent
 * for. That's also why `transports` is pinned to websocket: RN doesn't get
 * the header through on the XHR-polling path the way a browser would.
 *
 * The cookie is read once, at connect time. A reconnect after a drop reuses
 * this same options object rather than re-reading it, so a session that
 * rotates mid-connection would need a fresh socket, not just a reconnect —
 * fine for how long Better Auth sessions live, worth revisiting if that ever
 * changes.
 */
async function createSocket(): Promise<Socket> {
    const cookie = await authClient.getCookie();

    return io(process.env.EXPO_PUBLIC_SERVER_URL, {
        transports: ["websocket"],
        extraHeaders: { cookie },
    });
}

/** Lazily creates and memoizes the one socket connection for the app's lifetime. */
export function getSocket(): Promise<Socket> {
    if (socket) return Promise.resolve(socket);

    connecting ??= createSocket().then((created) => {
        socket = created;
        return created;
    });

    return connecting;
}

/**
 * Mirrors the ack-based room protocol in apps/api/src/realtime/server.ts:
 * every join/leave is an emit with an acknowledgement, never a fire-and-forget.
 */
async function emitRoomRequest(event: string, id: string): Promise<RoomAck> {
    const activeSocket = await getSocket();

    return new Promise((resolve) => {
        activeSocket.emit(event, id, (ack: RoomAck) => resolve(ack));
    });
}

export function joinWorkspace(workspaceId: string) {
    return emitRoomRequest("workspace:join", workspaceId);
}

export function leaveWorkspace(workspaceId: string) {
    return emitRoomRequest("workspace:leave", workspaceId);
}

export function joinChat(chatId: string) {
    return emitRoomRequest("chat:join", chatId);
}

export function leaveChat(chatId: string) {
    return emitRoomRequest("chat:leave", chatId);
}

/** Call on sign-out so a stale session's socket doesn't linger into the next one. */
export function disconnectSocket() {
    socket?.disconnect();
    socket = null;
    connecting = null;
}
