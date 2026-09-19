import { getNoteForUser } from "./service.js";

import type { WorkspaceRole } from "../../shared/services/workspaceAccess.js";
import ApiError from "../../shared/utils/ApiError.js";
import parseUuidParam from "../../shared/utils/parseUuidParam.js";

import type { Note } from "./service.js";
import type { NextFunction, Request, Response } from "express";

/**
 * req.note is typed optional, because only the routes sitting behind
 * requireNoteAccess ever populate it. This lets those controllers read it as a
 * plain Note instead of each one asserting non-null.
 *
 * An absent row means the route was mounted without the guard, which also means
 * it was never authorized, so it throws rather than failing quietly on an
 * undefined property.
 */
export function noteOf(req: Request): Note {
    if (!req.note) throw ApiError.internal("Note access guard did not run");

    return req.note;
}

/**
 * /notes/:noteId carries no workspaceId, so membership is resolved from the
 * note's own workspace. A missing note and a note in someone else's workspace
 * both 404, so the id space isn't probeable.
 */
export default function requireNoteAccess(allowedRoles: WorkspaceRole[]) {
    return async function noteAccessGuard(
        req: Request<{ noteId: string }>,
        _res: Response,
        next: NextFunction,
    ) {
        const row = await getNoteForUser(parseUuidParam(req.params.noteId, "noteId"), req.user.id);

        if (!row) throw ApiError.notFound("Note not found");
        if (!allowedRoles.includes(row.role)) throw ApiError.forbidden();

        req.note = row.note;

        next();
    };
}
