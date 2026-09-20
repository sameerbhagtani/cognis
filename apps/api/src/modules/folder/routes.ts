import { Router } from "express";

import * as folderController from "./controller.js";
import requireFolderAccess from "./middleware.js";

import requireWorkspaceRole from "../../shared/middlewares/requireWorkspaceRole.js";
import { MEMBER_ROLES, WRITE_ROLES } from "../../shared/services/workspaceAccess.js";
import { rateLimitWorkspaceWrite } from "../../shared/middlewares/rateLimit.js";

// Mounted after requireFolderAccess, which is where req.folder gives us the workspace.
const limitFolderWrite = rateLimitWorkspaceWrite((req) => req.folder?.workspaceId);

// A create has no req.folder yet, so it keys off the membership the role guard
// just resolved rather than the raw path param.
const limitWorkspaceFolderWrite = rateLimitWorkspaceWrite(
    (req) => req.workspaceMember?.workspaceId,
);

// Workspace-scoped: mounted under /workspaces/:workspaceId/folders, so the
// workspace guards apply directly.
export const workspaceFolderRoutes = Router({ mergeParams: true });

workspaceFolderRoutes.post(
    "/",
    requireWorkspaceRole(WRITE_ROLES),
    limitWorkspaceFolderWrite,
    folderController.createFolder,
);
workspaceFolderRoutes.get("/", requireWorkspaceRole(MEMBER_ROLES), folderController.listFolders);

// Resource-scoped: mounted at /folders, no workspaceId in the path, so
// requireFolderAccess resolves the workspace from the folder row itself.
export const folderRoutes = Router();

folderRoutes.get("/:folderId", requireFolderAccess(MEMBER_ROLES), folderController.getFolder);
folderRoutes.patch(
    "/:folderId",
    requireFolderAccess(WRITE_ROLES),
    limitFolderWrite,
    folderController.updateFolder,
);
folderRoutes.delete(
    "/:folderId",
    requireFolderAccess(WRITE_ROLES),
    limitFolderWrite,
    folderController.deleteFolder,
);
folderRoutes.post(
    "/:folderId/restore",
    requireFolderAccess(WRITE_ROLES),
    limitFolderWrite,
    folderController.restoreFolder,
);
