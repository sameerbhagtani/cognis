import * as noteService from "./service.js";
import { noteOf } from "./middleware.js";
import { createNoteSchema, listNotesQuerySchema, updateNoteSchema } from "./validation.js";

import { getLiveFolder, isFolderTrashedOutsideBatch } from "../folder/service.js";
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

    const deletedBatchId = await noteService.softDeleteNote(note.id);

    return ApiResponse.success(res, "Note moved to trash", { deletedBatchId });
}

export async function restoreNote(req: Request<NoteParams>, res: Response) {
    const note = noteOf(req);

    if (!note.deletedAt || !note.deletedBatchId) {
        throw ApiError.badRequest("Note is not in the trash");
    }

    // A note trashed on its own keeps its own batch, so its folder can have been
    // trashed separately afterwards. Restoring into a trashed folder would leave a
    // live note no folder query can reach. A folder inside this same batch is
    // fine: the note went down with it and comes back with it.
    if (note.folderId) {
        const blocked = await isFolderTrashedOutsideBatch(note.folderId, note.deletedBatchId);
        if (blocked) throw ApiError.conflict("Restore the parent folder first");
    }

    await restoreBatch(note.deletedBatchId);

    return ApiResponse.success(res, "Note restored", { deletedBatchId: note.deletedBatchId });
}
