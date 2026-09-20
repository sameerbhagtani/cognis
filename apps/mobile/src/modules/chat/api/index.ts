import { api } from "@/lib/api";

import type { ApiSuccess } from "@/lib/api";
import type { Chat, ChatWithMessages, SentMessage } from "../types";

/** Your own chats in this workspace, newest activity first. */
export async function fetchChats(workspaceId: string): Promise<Chat[]> {
    const { data } = await api.get<ApiSuccess<Chat[]>>(`/workspaces/${workspaceId}/chats`);

    return data.data;
}

export async function createChat(workspaceId: string, title?: string): Promise<Chat> {
    const { data } = await api.post<ApiSuccess<Chat>>(`/workspaces/${workspaceId}/chats`, {
        ...(title ? { title } : {}),
    });

    return data.data;
}

export async function fetchChat(chatId: string): Promise<ChatWithMessages> {
    const { data } = await api.get<ApiSuccess<ChatWithMessages>>(`/chats/${chatId}`);

    return data.data;
}

export async function deleteChat(chatId: string): Promise<void> {
    await api.delete(`/chats/${chatId}`);
}

/**
 * Returns as soon as the question is stored - the answer is generated detached
 * and streams into the chat's socket room, so the caller needs to be in that
 * room before this is called or it will miss the opening tokens.
 *
 * A 429 here is the spend guard rather than rate limiting proper: the daily AI
 * allowance, or the global ceiling across everyone.
 */
export async function sendMessage(chatId: string, content: string): Promise<SentMessage> {
    const { data } = await api.post<ApiSuccess<SentMessage>>(`/chats/${chatId}/messages`, {
        content,
    });

    return data.data;
}
