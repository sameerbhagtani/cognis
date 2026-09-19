import { getFolderForUser } from "./service.js";

import type { WorkspaceRole } from "../../shared/services/workspaceAccess.js";
import ApiError from "../../shared/utils/ApiError.js";
import parseUuidParam from "../../shared/utils/parseUuidParam.js";

import type { Folder } from "./service.js";
import type { NextFunction, Request, Response } from "express";

/**
 * req.folder is typed optional, because only the routes sitting behind
 * requireFolderAccess ever populate it. This lets those controllers read it as a
 * plain Folder instead of each one asserting non-null.
 *
 * An absent row means the route was mounted without the guard, which also means
 * it was never authorized, so it throws rather than failing quietly on an
 * undefined property.
 */
export function folderOf(req: Request): Folder {
    if (!req.folder) throw ApiError.internal("Folder access guard did not run");

    return req.folder;
}

/**
 * /folders/:folderId carries no workspaceId, so membership is resolved from the
 * folder's own workspace. Keeping this in middleware means a route's permissions
 * are readable from routes.ts, the same as the workspace-scoped guards.
 *
 * A missing folder and a folder in someone else's workspace both 404, so the id
 * space isn't probeable. The row is attached to req.folder to save the handler a
 * second lookup.
 */
export default function requireFolderAccess(allowedRoles: WorkspaceRole[]) {
    return async function folderAccessGuard(
        req: Request<{ folderId: string }>,
        _res: Response,
        next: NextFunction,
    ) {
        const row = await getFolderForUser(
            parseUuidParam(req.params.folderId, "folderId"),
            req.user.id,
        );

        if (!row) throw ApiError.notFound("Folder not found");
        if (!allowedRoles.includes(row.role)) throw ApiError.forbidden();

        req.folder = row.folder;

        next();
    };
}
