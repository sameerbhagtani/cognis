import { workspaceRoom, type WorkspaceEvents, type WorkspaceEventName } from "./events.js";
import { throttleByKey } from "./throttle.js";

import type { Server } from "socket.io";

const NOTE_UPDATE_THROTTLE_MS = 1000;

let io: Server | null = null;

export function setSocketServer(server: Server) {
    io = server;
}

/**
 * The seam between REST and the socket layer: controllers call this and never
 * import socket.io, so a missing server (tests, scripts) is a no-op rather than
 * a crash.
 *
 * Always called after the transaction commits — broadcasting a change that then
 * rolls back would leave every other client showing something that never
 * happened.
 */
export function emitToWorkspace<E extends WorkspaceEventName>(
    workspaceId: string,
    event: E,
    payload: WorkspaceEvents[E],
) {
    io?.to(workspaceRoom(workspaceId)).emit(event, payload);
}

/**
 * Autosave can write many times a second, and every write would otherwise become
 * a broadcast to every viewer. Throttled per note, so one busy note can't drown
 * out the rest of the workspace.
 */
export function emitNoteUpdated(workspaceId: string, payload: WorkspaceEvents["note:updated"]) {
    throttleByKey(`note:${payload.id}`, NOTE_UPDATE_THROTTLE_MS, () => {
        emitToWorkspace(workspaceId, "note:updated", payload);
    });
}

/**
 * Losing membership has to end the subscription too. Without this the removed
 * user keeps receiving broadcasts for a workspace they can no longer read, since
 * the room membership outlives the database row.
 */
export async function removeUserFromWorkspaceRoom(workspaceId: string, userId: string) {
    if (!io) return;

    const room = workspaceRoom(workspaceId);
    const sockets = await io.in(room).fetchSockets();

    for (const socket of sockets) {
        if (socket.data.userId === userId) socket.leave(room);
    }
}

/**
 * A batch can hold folders, notes, or both, so only the events it actually
 * warrants go out. Shared by all three restore endpoints, which differ in how
 * they're addressed but restore the same unit.
 */
export function emitBatchRestored(
    workspaceId: string,
    deletedBatchId: string,
    restored: { folderIds: string[]; noteIds: string[] },
) {
    if (restored.folderIds.length > 0) {
        emitToWorkspace(workspaceId, "folder:restored", {
            deletedBatchId,
            folderIds: restored.folderIds,
        });
    }

    if (restored.noteIds.length > 0) {
        emitToWorkspace(workspaceId, "note:restored", {
            deletedBatchId,
            noteIds: restored.noteIds,
        });
    }
}

/**
 * A deleted workspace's room can never receive anything again, so everyone is
 * dropped from it once the deletion is announced. Otherwise sockets sit
 * subscribed to a workspace that no longer exists, and a later id collision
 * would deliver to them.
 */
export async function clearWorkspaceRoom(workspaceId: string) {
    if (!io) return;

    const room = workspaceRoom(workspaceId);
    const sockets = await io.in(room).fetchSockets();

    for (const socket of sockets) socket.leave(room);
}
