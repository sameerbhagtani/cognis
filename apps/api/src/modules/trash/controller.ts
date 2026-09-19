import * as trashService from "./service.js";

import { assertWorkspaceRole, WRITE_ROLES } from "../../shared/services/workspaceAccess.js";
import { findBatchWorkspaceId, restoreBatch } from "../../shared/services/trash.js";
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

    await restoreBatch(workspaceId, deletedBatchId);

    return ApiResponse.success(res, "Trash batch restored", { deletedBatchId });
}
