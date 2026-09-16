import { assertWorkspaceRole, type WorkspaceRole } from "../services/workspaceAccess.js";
import parseUuidParam from "../utils/parseUuidParam.js";

import type { NextFunction, Request, Response } from "express";

type WorkspaceParams = { workspaceId: string };

export default function requireWorkspaceRole(allowedRoles: WorkspaceRole[]) {
    return async function workspaceRoleGuard(
        req: Request<WorkspaceParams>,
        _res: Response,
        next: NextFunction,
    ) {
        req.workspaceMember = await assertWorkspaceRole(
            parseUuidParam(req.params.workspaceId, "workspaceId"),
            req.user.id,
            allowedRoles,
        );

        next();
    };
}
