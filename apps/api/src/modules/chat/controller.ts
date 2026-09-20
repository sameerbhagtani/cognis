import * as chatService from "./service.js";
import { chatOf } from "./middleware.js";
import { createChatSchema, sendMessageSchema } from "./validation.js";

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
 * Records the question. Generating the answer arrives with the streaming work —
 * until then this persists the turn and names the chat after it.
 *
 * The budget guard runs before this in the route, so nothing is written for a
 * request that could not have been answered anyway.
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

    return ApiResponse.created(res, "Message sent", message);
}
