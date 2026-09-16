import { assertWorkspaceOwner } from "../services/workspaceAccess.js";
import parseUuidParam from "../utils/parseUuidParam.js";

import type { NextFunction, Request, Response } from "express";

export default async function requireWorkspaceOwner(
    req: Request<{ workspaceId: string }>,
    _res: Response,
    next: NextFunction,
) {
    await assertWorkspaceOwner(parseUuidParam(req.params.workspaceId, "workspaceId"), req.user.id);

    next();
}
