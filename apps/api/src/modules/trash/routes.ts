import { Router } from "express";

import * as trashController from "./controller.js";

import requireWorkspaceRole from "../../shared/middlewares/requireWorkspaceRole.js";
import { MEMBER_ROLES } from "../../shared/services/workspaceAccess.js";
import { rateLimitByUser } from "../../shared/middlewares/rateLimit.js";

// Workspace-scoped: mounted under /workspaces/:workspaceId/trash.
export const workspaceTrashRoutes = Router({ mergeParams: true });

workspaceTrashRoutes.get("/", requireWorkspaceRole(MEMBER_ROLES), trashController.listTrash);

// Batch-scoped: mounted at /trash. The batch id resolves its own workspace, so
// the role check happens in the controller once that's known.
export const trashRoutes = Router();

// The workspace isn't known until the controller resolves it from the batch, so
// this leans on the per-user limit rather than a per-workspace one.
trashRoutes.post("/:deletedBatchId/restore", rateLimitByUser, trashController.restoreTrashBatch);
