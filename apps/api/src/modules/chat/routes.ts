import { Router } from "express";

import * as chatController from "./controller.js";
import requireChatAccess, { requireChatBudget } from "./middleware.js";

import requireWorkspaceRole from "../../shared/middlewares/requireWorkspaceRole.js";
import { MEMBER_ROLES } from "../../shared/services/workspaceAccess.js";
import { rateLimitChatMessage } from "../../shared/middlewares/rateLimit.js";

// Workspace-scoped: mounted under /workspaces/:workspaceId/chats.
//
// Viewers may chat. Chatting is reading, and a viewer can already open every
// note in the workspace, so nothing is exposed that they could not reach.
export const workspaceChatRoutes = Router({ mergeParams: true });

workspaceChatRoutes.post("/", requireWorkspaceRole(MEMBER_ROLES), chatController.createChat);
workspaceChatRoutes.get("/", requireWorkspaceRole(MEMBER_ROLES), chatController.listChats);

// Resource-scoped: mounted at /chats, where the chat row resolves its own
// workspace and requireChatAccess checks ownership and membership together.
export const chatRoutes = Router();

chatRoutes.get("/:chatId", requireChatAccess, chatController.getChat);
chatRoutes.delete("/:chatId", requireChatAccess, chatController.deleteChat);

// Order matters: prove the chat is yours, then that the traffic is reasonable,
// then that there is budget left — cheapest checks first, and no spend guard
// evaluated for a chat the caller cannot reach.
chatRoutes.post(
    "/:chatId/messages",
    requireChatAccess,
    rateLimitChatMessage,
    requireChatBudget,
    chatController.sendMessage,
);
