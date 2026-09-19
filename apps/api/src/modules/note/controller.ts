import * as noteService from "./service.js";
import { noteOf } from "./middleware.js";
import { createNoteSchema, listNotesQuerySchema, updateNoteSchema } from "./validation.js";

import { getLiveFolder } from "../folder/service.js";
import { restoreBatch } from "../../shared/services/trash.js";
import ApiError from "../../shared/utils/ApiError.js";
import ApiResponse from "../../shared/utils/ApiResponse.js";

import type { Request, Response } from "express";

type WorkspaceParams = { workspaceId: string };
type NoteParams = { noteId: string };

export async function createNote(req: Request<WorkspaceParams>, res: Response) {
    const { workspaceId } = req.params;
    const { title, content, folderId } = createNoteSchema.parse(req.body);

    if (folderId) {
        const folder = await getLiveFolder(workspaceId, folderId);
        if (!folder) throw ApiError.notFound("Folder not found");
    }

    const note = await noteService.createNote({
        workspaceId,
        folderId: folderId ?? null,
        title,
        content: content ?? null,
    });

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

    if (folderId !== undefined && folderId !== null) {
        const folder = await getLiveFolder(note.workspaceId, folderId);
        if (!folder) throw ApiError.notFound("Folder not found");
    }

    const updated = await noteService.updateNote(note.id, {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(folderId !== undefined && { folderId }),
    });

    return ApiResponse.success(res, "Note updated", updated);
}

export async function deleteNote(req: Request<NoteParams>, res: Response) {
    const note = noteOf(req);

    if (note.deletedAt) throw ApiError.notFound("Note not found");

    const deletedBatchId = await noteService.softDeleteNote(note.workspaceId, note.id);

    return ApiResponse.success(res, "Note moved to trash", { deletedBatchId });
}

export async function restoreNote(req: Request<NoteParams>, res: Response) {
    const note = noteOf(req);

    if (!note.deletedAt || !note.deletedBatchId) {
        throw ApiError.badRequest("Note is not in the trash");
    }

    // restoreBatch owns the orphan check: it has to run under the same lock as
    // the write, or a concurrent delete lands between them.
    await restoreBatch(note.workspaceId, note.deletedBatchId);

    return ApiResponse.success(res, "Note restored", { deletedBatchId: note.deletedBatchId });
}
