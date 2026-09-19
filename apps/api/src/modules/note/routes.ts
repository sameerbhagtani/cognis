import { Router } from "express";

import * as noteController from "./controller.js";
import requireNoteAccess from "./middleware.js";

import requireWorkspaceRole from "../../shared/middlewares/requireWorkspaceRole.js";
import { MEMBER_ROLES, WRITE_ROLES } from "../../shared/services/workspaceAccess.js";

// Workspace-scoped: mounted under /workspaces/:workspaceId/notes.
export const workspaceNoteRoutes = Router({ mergeParams: true });

workspaceNoteRoutes.post("/", requireWorkspaceRole(WRITE_ROLES), noteController.createNote);
workspaceNoteRoutes.get("/", requireWorkspaceRole(MEMBER_ROLES), noteController.listNotes);

// Resource-scoped: mounted at /notes, so requireNoteAccess resolves the
// workspace from the note row itself.
export const noteRoutes = Router();

noteRoutes.get("/:noteId", requireNoteAccess(MEMBER_ROLES), noteController.getNote);
noteRoutes.patch("/:noteId", requireNoteAccess(WRITE_ROLES), noteController.updateNote);
noteRoutes.delete("/:noteId", requireNoteAccess(WRITE_ROLES), noteController.deleteNote);
noteRoutes.post("/:noteId/restore", requireNoteAccess(WRITE_ROLES), noteController.restoreNote);
