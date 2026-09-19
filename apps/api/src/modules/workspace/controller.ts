import * as workspaceService from "./service.js";
import { createWorkspaceSchema, renameWorkspaceSchema } from "./validation.js";

import { clearWorkspaceRoom, emitToWorkspace } from "../../realtime/emitter.js";
import ApiError from "../../shared/utils/ApiError.js";
import ApiResponse from "../../shared/utils/ApiResponse.js";

import type { Request, Response } from "express";

type WorkspaceParams = { workspaceId: string };

export async function createWorkspace(req: Request, res: Response) {
    const { name } = createWorkspaceSchema.parse(req.body);

    const workspace = await workspaceService.createWorkspace(req.user.id, name);

    return ApiResponse.created(res, "Workspace created", { ...workspace, role: "owner" });
}

export async function listWorkspaces(req: Request, res: Response) {
    const workspaces = await workspaceService.listWorkspacesForUser(req.user.id);

    return ApiResponse.success(res, "Workspaces fetched", workspaces);
}

export async function getWorkspace(req: Request<WorkspaceParams>, res: Response) {
    const workspace = await workspaceService.getWorkspaceById(req.params.workspaceId);

    if (!workspace) throw ApiError.notFound("Workspace not found");

    return ApiResponse.success(res, "Workspace fetched", {
        ...workspace,
        role: req.workspaceMember?.role,
    });
}

export async function renameWorkspace(req: Request<WorkspaceParams>, res: Response) {
    const { name } = renameWorkspaceSchema.parse(req.body);

    const workspace = await workspaceService.renameWorkspace(req.params.workspaceId, name);

    emitToWorkspace(workspace.id, "workspace:updated", workspace);

    return ApiResponse.success(res, "Workspace renamed", workspace);
}

export async function deleteWorkspace(req: Request<WorkspaceParams>, res: Response) {
    const { workspaceId } = req.params;

    await workspaceService.deleteWorkspace(workspaceId);

    // Announced before the room is torn down, for the same reason a removed
    // member is: the event is the last thing that room will ever deliver.
    emitToWorkspace(workspaceId, "workspace:deleted", { id: workspaceId });
    await clearWorkspaceRoom(workspaceId);

    return ApiResponse.noContent(res);
}
