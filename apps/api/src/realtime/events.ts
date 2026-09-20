import type { Folder } from "../modules/folder/service.js";
import type { Workspace } from "../modules/workspace/service.js";
import type { Note } from "../modules/note/service.js";
import type { WorkspaceRole } from "../shared/services/workspaceAccess.js";

export function workspaceRoom(workspaceId: string) {
    return `workspace:${workspaceId}`;
}

/**
 * A room per chat rather than per user, so several devices open on the same
 * conversation all follow the stream while chats nobody is looking at cost
 * nothing to deliver.
 */
export function chatRoom(chatId: string) {
    return `chat:${chatId}`;
}

/**
 * Payloads stay deliberately thin where the client would refetch anyway. A move
 * or a delete changes a whole subtree, and a restore a whole batch, so sending
 * the affected ids is cheaper than serializing the subtree into every message.
 *
 * note:updated carries no content for the same reason: it is the one event that
 * fires on autosave, and a long note would otherwise be pushed to every viewer
 * on every throttle window. Clients holding the note open refetch on the event.
 */
export type WorkspaceEvents = {
    "workspace:updated": Workspace;
    "workspace:deleted": { id: string };

    "folder:created": Folder;
    "folder:updated": Folder;
    "folder:moved": { id: string; parentFolderId: string | null };
    "folder:deleted": { id: string; deletedBatchId: string };
    "folder:restored": { deletedBatchId: string; folderIds: string[] };

    "note:created": Note;
    "note:updated": { id: string; title: string; folderId: string | null; updatedAt: Date };
    "note:moved": { id: string; folderId: string | null };
    "note:deleted": { id: string; deletedBatchId: string };
    "note:restored": { deletedBatchId: string; noteIds: string[] };

    "member:role_changed": { userId: string; role: WorkspaceRole };
    "member:removed": { userId: string };
};

export type WorkspaceEventName = keyof WorkspaceEvents;

/**
 * Sent to one chat's room while an answer is generated.
 *
 * The stream is a convenience, not the record. The assistant's message is saved
 * whether or not anyone is listening, so a client that misses these — a dropped
 * connection, a phone that slept — reloads the chat and finds the finished
 * message waiting.
 */
export type ChatEvents = {
    "chat:message_started": { chatId: string; messageId: string };
    "chat:token": { chatId: string; messageId: string; delta: string };
    "chat:message_completed": {
        chatId: string;
        messageId: string;
        content: string;
        citedNoteIds: string[];
        truncated: boolean;
    };
    "chat:error": { chatId: string; messageId: string; message: string };
};

export type ChatEventName = keyof ChatEvents;
