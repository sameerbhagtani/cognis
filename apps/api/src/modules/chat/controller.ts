import { randomUUID } from "node:crypto";

import * as chatService from "./service.js";
import { chatOf } from "./middleware.js";
import { createChatSchema, sendMessageSchema } from "./validation.js";

import { generateAssistantReply } from "../../shared/services/chatCompletion.js";
import ApiResponse from "../../shared/utils/ApiResponse.js";

import type { Request, Response } from "express";

type WorkspaceParams = { workspaceId: string };
type ChatParams = { chatId: string };

export async function createChat(req: Request<WorkspaceParams>, res: Response) {
    const { title } = createChatSchema.parse(req.body);

    const chat = await chatService.createChat(req.params.workspaceId, req.user.id, title);

    return ApiResponse.created(res, "Chat created", chat);
}

export async function listChats(req: Request<WorkspaceParams>, res: Response) {
    const chats = await chatService.listChats(req.params.workspaceId, req.user.id);

    return ApiResponse.success(res, "Chats fetched", chats);
}

export async function getChat(req: Request<ChatParams>, res: Response) {
    const chat = chatOf(req);
    const messages = await chatService.listMessages(chat.id);

    return ApiResponse.success(res, "Chat fetched", { ...chat, messages });
}

export async function deleteChat(req: Request<ChatParams>, res: Response) {
    await chatService.deleteChat(chatOf(req).id);

    return ApiResponse.noContent(res);
}

/**
 * Records the question and starts the answer.
 *
 * The reply is not awaited. It streams to the chat's room over the socket and
 * is saved when it finishes, so this responds as soon as the question is
 * stored rather than holding a request open for the length of a generation.
 *
 * The assistant's message id is chosen here and returned, so the client can
 * follow the stream for a message that does not exist in the database yet.
 *
 * The budget guard runs before this in the route, so nothing is written or
 * spent for a request that could not have been answered anyway.
 */
export async function sendMessage(req: Request<ChatParams>, res: Response) {
    const chat = chatOf(req);
    const { content } = sendMessageSchema.parse(req.body);

    const isFirst = (await chatService.countMessages(chat.id)) === 0;

    const message = await chatService.appendMessage({
        chatId: chat.id,
        role: "user",
        content,
    });

    // Only the opening question names the chat, and only if it has not been
    // named already — a title the user chose should not be overwritten.
    if (isFirst && chat.title === chatService.UNTITLED_CHAT) {
        await chatService.renameChat(chat.id, chatService.titleFromMessage(content));
    }

    const assistantMessageId = randomUUID();

    // Deliberately not awaited, and it never rejects — every failure inside
    // reaches the client as a chat:error rather than as a rejected request that
    // has already been answered.
    void generateAssistantReply({
        chatId: chat.id,
        workspaceId: chat.workspaceId,
        userId: req.user.id,
        assistantMessageId,
        question: content,
    });

    return ApiResponse.created(res, "Message sent", { message, assistantMessageId });
}
