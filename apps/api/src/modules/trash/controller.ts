import * as trashService from "./service.js";

import { assertWorkspaceRole, WRITE_ROLES } from "../../shared/services/workspaceAccess.js";
import { findBatchWorkspaceId, restoreBatch } from "../../shared/services/trash.js";
import { emitBatchRestored } from "../../realtime/emitter.js";
import { consumeWorkspaceWriteLimit } from "../../shared/middlewares/rateLimit.js";
import ApiError from "../../shared/utils/ApiError.js";
import ApiResponse from "../../shared/utils/ApiResponse.js";
import parseUuidParam from "../../shared/utils/parseUuidParam.js";

import type { Request, Response } from "express";

type WorkspaceParams = { workspaceId: string };
type BatchParams = { deletedBatchId: string };

export async function listTrash(req: Request<WorkspaceParams>, res: Response) {
    const batches = await trashService.listTrash(req.params.workspaceId);

    return ApiResponse.success(res, "Trash fetched", batches);
}

export async function restoreTrashBatch(req: Request<BatchParams>, res: Response) {
    const deletedBatchId = parseUuidParam(req.params.deletedBatchId, "deletedBatchId");

    // The route carries no workspaceId, so the batch names its own workspace and
    // authorization follows from that. An unknown batch and a batch in a workspace
    // the caller can't reach are both 404.
    const workspaceId = await findBatchWorkspaceId(deletedBatchId);
    if (!workspaceId) throw ApiError.notFound("Trash batch not found");

    await assertWorkspaceRole(workspaceId, req.user.id, WRITE_ROLES);

    // Spent here rather than in middleware because the workspace only becomes
    // known once the batch resolves it, and after the access check so a caller
    // can't burn a workspace's budget through batches they can't reach. The
    // restore takes the workspace lock like every other tree write, so it needs
    // the same bucket the folder and note restores are mounted with.
    await consumeWorkspaceWriteLimit(res, req.user.id, workspaceId);

    const restored = await restoreBatch(workspaceId, deletedBatchId);

    emitBatchRestored(workspaceId, deletedBatchId, restored);

    return ApiResponse.success(res, "Trash batch restored", { deletedBatchId });
}
