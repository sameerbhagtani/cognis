import { and, asc, db, desc, eq, schemas } from "@cognis/database";

import type { DbOrTx } from "../../shared/services/workspaceLock.js";

export type Chat = typeof schemas.chat.$inferSelect;
export type Message = typeof schemas.message.$inferSelect;
export type MessageRole = (typeof schemas.messageRoleEnum.enumValues)[number];

/** Until the first message arrives and names it after what was asked. */
export const UNTITLED_CHAT = "New chat";

export async function createChat(workspaceId: string, userId: string, title?: string) {
    const [created] = await db
        .insert(schemas.chat)
        .values({ workspaceId, userId, title: title ?? UNTITLED_CHAT })
        .returning();

    return created;
}

/** Only the caller's own chats — they are private even from the workspace owner. */
export async function listChats(workspaceId: string, userId: string) {
    return db
        .select()
        .from(schemas.chat)
        .where(and(eq(schemas.chat.workspaceId, workspaceId), eq(schemas.chat.userId, userId)))
        .orderBy(desc(schemas.chat.updatedAt));
}

/**
 * Joined against the caller's membership, so losing access to the workspace
 * loses access to the chats made in it. The chat rows stay; they simply become
 * unreachable, and are removed only when the workspace or the user is.
 */
export async function getChatForUser(chatId: string, userId: string) {
    const [row] = await db
        .select({ chat: schemas.chat, role: schemas.workspaceMember.role })
        .from(schemas.chat)
        .innerJoin(
            schemas.workspaceMember,
            and(
                eq(schemas.workspaceMember.workspaceId, schemas.chat.workspaceId),
                eq(schemas.workspaceMember.userId, userId),
            ),
        )
        .where(eq(schemas.chat.id, chatId))
        .limit(1);

    return row ?? null;
}

export async function listMessages(chatId: string, executor: DbOrTx = db) {
    return executor
        .select()
        .from(schemas.message)
        .where(eq(schemas.message.chatId, chatId))
        .orderBy(asc(schemas.message.createdAt));
}

export async function countMessages(chatId: string, executor: DbOrTx = db) {
    const rows = await executor
        .select({ id: schemas.message.id })
        .from(schemas.message)
        .where(eq(schemas.message.chatId, chatId))
        .limit(1);

    return rows.length;
}

export type AppendMessageInput = {
    chatId: string;
    role: MessageRole;
    content: string;
    citedNoteIds?: string[] | null;
    /** Chosen up front for an assistant reply, so the client can follow the
     *  stream for a message that does not exist in the database yet. */
    id?: string;
};

/**
 * Appending also touches the chat, so the list stays ordered by real activity
 * rather than by when each chat happened to be created.
 */
export async function appendMessage(input: AppendMessageInput, executor: DbOrTx = db) {
    const [created] = await executor
        .insert(schemas.message)
        .values({
            ...(input.id ? { id: input.id } : {}),
            chatId: input.chatId,
            role: input.role,
            content: input.content,
            citedNoteIds: input.citedNoteIds ?? null,
        })
        .returning();

    await executor
        .update(schemas.chat)
        .set({ updatedAt: new Date() })
        .where(eq(schemas.chat.id, input.chatId));

    return created;
}

/** Named after the question that started it, the way any chat app does. */
export function titleFromMessage(content: string): string {
    const collapsed = content.replace(/\s+/g, " ").trim();

    return collapsed.length <= 100 ? collapsed : `${collapsed.slice(0, 97)}...`;
}

export async function renameChat(chatId: string, title: string, executor: DbOrTx = db) {
    await executor.update(schemas.chat).set({ title }).where(eq(schemas.chat.id, chatId));
}

export async function deleteChat(chatId: string) {
    await db.delete(schemas.chat).where(eq(schemas.chat.id, chatId));
}
