import * as folderService from "./service.js";
import { folderOf } from "./middleware.js";
import { createFolderSchema, listFoldersQuerySchema, updateFolderSchema } from "./validation.js";

import { restoreBatch } from "../../shared/services/trash.js";
import ApiError from "../../shared/utils/ApiError.js";
import ApiResponse from "../../shared/utils/ApiResponse.js";

import type { Request, Response } from "express";

type WorkspaceParams = { workspaceId: string };
type FolderParams = { folderId: string };

export async function createFolder(req: Request<WorkspaceParams>, res: Response) {
    const { workspaceId } = req.params;
    const { name, parentFolderId } = createFolderSchema.parse(req.body);

    if (parentFolderId) {
        const parent = await folderService.getLiveFolder(workspaceId, parentFolderId);
        if (!parent) throw ApiError.notFound("Parent folder not found");
    }

    const folder = await folderService.createFolder(workspaceId, name, parentFolderId ?? null);

    return ApiResponse.created(res, "Folder created", folder);
}

export async function listFolders(req: Request<WorkspaceParams>, res: Response) {
    const { parentFolderId } = listFoldersQuerySchema.parse(req.query);

    const folders = await folderService.listFolders(
        req.params.workspaceId,
        parentFolderId === undefined
            ? undefined
            : parentFolderId === "null"
              ? null
              : parentFolderId,
    );

    return ApiResponse.success(res, "Folders fetched", folders);
}

export async function getFolder(req: Request<FolderParams>, res: Response) {
    return ApiResponse.success(res, "Folder fetched", folderOf(req));
}

export async function updateFolder(req: Request<FolderParams>, res: Response) {
    const folder = folderOf(req);
    const { name, parentFolderId } = updateFolderSchema.parse(req.body);

    if (folder.deletedAt) throw ApiError.notFound("Folder not found");

    // The parent check and the cycle check live in the service, because a move has
    // to validate and write in one transaction to stay safe under concurrency.
    const updated = await folderService.applyFolderUpdate(folder, {
        ...(name !== undefined && { name }),
        ...(parentFolderId !== undefined && { parentFolderId }),
    });

    return ApiResponse.success(res, "Folder updated", updated);
}

export async function deleteFolder(req: Request<FolderParams>, res: Response) {
    const folder = folderOf(req);

    if (folder.deletedAt) throw ApiError.notFound("Folder not found");

    const deletedBatchId = await folderService.softDeleteFolder(folder.workspaceId, folder.id);

    return ApiResponse.success(res, "Folder moved to trash", { deletedBatchId });
}

export async function restoreFolder(req: Request<FolderParams>, res: Response) {
    const folder = folderOf(req);

    if (!folder.deletedAt || !folder.deletedBatchId) {
        throw ApiError.badRequest("Folder is not in the trash");
    }

    // restoreBatch owns the orphan check: it has to run under the same lock as
    // the write, or a concurrent delete lands between them.
    await restoreBatch(folder.workspaceId, folder.deletedBatchId);

    return ApiResponse.success(res, "Folder restored", { deletedBatchId: folder.deletedBatchId });
}
