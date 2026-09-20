import { Router } from "express";

import * as trashController from "./controller.js";

import requireWorkspaceRole from "../../shared/middlewares/requireWorkspaceRole.js";
import { MEMBER_ROLES } from "../../shared/services/workspaceAccess.js";

// Workspace-scoped: mounted under /workspaces/:workspaceId/trash.
export const workspaceTrashRoutes = Router({ mergeParams: true });

workspaceTrashRoutes.get("/", requireWorkspaceRole(MEMBER_ROLES), trashController.listTrash);

// Batch-scoped: mounted at /trash. The batch id resolves its own workspace, so
// the role check happens in the controller once that's known.
export const trashRoutes = Router();

// No bucket of its own: the per-user limit already applies to everything under
// /api, and the workspace-scoped one can't be mounted here because the workspace
// isn't known until the controller resolves it from the batch.
trashRoutes.post("/:deletedBatchId/restore", trashController.restoreTrashBatch);
