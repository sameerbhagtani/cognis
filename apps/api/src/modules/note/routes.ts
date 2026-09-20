import { Router } from "express";

import * as noteController from "./controller.js";
import requireNoteAccess from "./middleware.js";

import requireWorkspaceRole from "../../shared/middlewares/requireWorkspaceRole.js";
import { MEMBER_ROLES, WRITE_ROLES } from "../../shared/services/workspaceAccess.js";
import {
    rateLimitNoteUpdate,
    rateLimitWorkspaceWrite,
} from "../../shared/middlewares/rateLimit.js";

// Mounted after requireNoteAccess, which is where req.note gives us the workspace.
const limitNoteWrite = rateLimitWorkspaceWrite((req) => req.note?.workspaceId);

// Workspace-scoped: mounted under /workspaces/:workspaceId/notes.
export const workspaceNoteRoutes = Router({ mergeParams: true });

workspaceNoteRoutes.post("/", requireWorkspaceRole(WRITE_ROLES), noteController.createNote);
workspaceNoteRoutes.get("/", requireWorkspaceRole(MEMBER_ROLES), noteController.listNotes);

// Resource-scoped: mounted at /notes, so requireNoteAccess resolves the
// workspace from the note row itself.
export const noteRoutes = Router();

noteRoutes.get("/:noteId", requireNoteAccess(MEMBER_ROLES), noteController.getNote);
// The edit limit is separate and looser than the workspace one: autosave is
// expected to be chatty, while deletes and restores take the workspace lock.
noteRoutes.patch(
    "/:noteId",
    requireNoteAccess(WRITE_ROLES),
    rateLimitNoteUpdate,
    noteController.updateNote,
);
noteRoutes.delete(
    "/:noteId",
    requireNoteAccess(WRITE_ROLES),
    limitNoteWrite,
    noteController.deleteNote,
);
noteRoutes.post(
    "/:noteId/restore",
    requireNoteAccess(WRITE_ROLES),
    limitNoteWrite,
    noteController.restoreNote,
);
