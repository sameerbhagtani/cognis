import * as noteService from "./service.js";
import { noteOf } from "./middleware.js";
import { createNoteSchema, listNotesQuerySchema, updateNoteSchema } from "./validation.js";

import { restoreBatch } from "../../shared/services/trash.js";
import { emitBatchRestored, emitNoteUpdated, emitToWorkspace } from "../../realtime/emitter.js";
import { scheduleNoteEmbedding } from "../../shared/services/embeddingScheduler.js";
import ApiError from "../../shared/utils/ApiError.js";
import ApiResponse from "../../shared/utils/ApiResponse.js";

import type { Request, Response } from "express";

type WorkspaceParams = { workspaceId: string };
type NoteParams = { noteId: string };

export async function createNote(req: Request<WorkspaceParams>, res: Response) {
    const { workspaceId } = req.params;
    const { title, content, folderId } = createNoteSchema.parse(req.body);

    // The folder check lives in the service alongside the insert: checking here
    // would leave a gap for a concurrent delete to trash the folder before the
    // row lands.
    const note = await noteService.createNote({
        workspaceId,
        folderId: folderId ?? null,
        title,
        content: content ?? null,
    });

    emitToWorkspace(workspaceId, "note:created", note);
    scheduleNoteEmbedding(note.id);

    return ApiResponse.created(res, "Note created", note);
}

export async function listNotes(req: Request<WorkspaceParams>, res: Response) {
    const { folderId } = listNotesQuerySchema.parse(req.query);

    const notes = await noteService.listNotes(
        req.params.workspaceId,
        folderId === undefined ? undefined : folderId === "null" ? null : folderId,
    );

    return ApiResponse.success(res, "Notes fetched", notes);
}

export async function getNote(req: Request<NoteParams>, res: Response) {
    return ApiResponse.success(res, "Note fetched", noteOf(req));
}

export async function updateNote(req: Request<NoteParams>, res: Response) {
    const note = noteOf(req);
    const { title, content, folderId } = updateNoteSchema.parse(req.body);

    if (note.deletedAt) throw ApiError.notFound("Note not found");

    // The target folder check lives in the service alongside the write, for the
    // same reason a folder move's does: checking here would leave a gap for a
    // concurrent delete to trash that folder before the move lands.
    const updated = await noteService.applyNoteUpdate(note, {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(folderId !== undefined && { folderId }),
    });

    // Only the edit is throttled; a move is a one-off structural change that
    // shouldn't wait behind an autosave window.
    if (title !== undefined || content !== undefined) {
        // A move changes no embedded text, so only a title or body edit is worth
        // queueing. Both are embedded, since the title rides on every chunk.
        scheduleNoteEmbedding(updated.id);

        emitNoteUpdated(note.workspaceId, {
            id: updated.id,
            title: updated.title,
            folderId: updated.folderId,
            updatedAt: updated.updatedAt,
        });
    }

    if (folderId !== undefined) {
        emitToWorkspace(note.workspaceId, "note:moved", {
            id: updated.id,
            folderId: updated.folderId,
        });
    }

    return ApiResponse.success(res, "Note updated", updated);
}

export async function deleteNote(req: Request<NoteParams>, res: Response) {
    const note = noteOf(req);

    if (note.deletedAt) throw ApiError.notFound("Note not found");

    const deletedBatchId = await noteService.softDeleteNote(note.workspaceId, note.id);

    emitToWorkspace(note.workspaceId, "note:deleted", { id: note.id, deletedBatchId });

    return ApiResponse.success(res, "Note moved to trash", { deletedBatchId });
}

export async function restoreNote(req: Request<NoteParams>, res: Response) {
    const note = noteOf(req);

    if (!note.deletedAt || !note.deletedBatchId) {
        throw ApiError.badRequest("Note is not in the trash");
    }

    // restoreBatch owns the orphan check: it has to run under the same lock as
    // the write, or a concurrent delete lands between them.
    const restored = await restoreBatch(note.workspaceId, note.deletedBatchId);

    emitBatchRestored(note.workspaceId, note.deletedBatchId, restored);

    return ApiResponse.success(res, "Note restored", { deletedBatchId: note.deletedBatchId });
}
