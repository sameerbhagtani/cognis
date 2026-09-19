import * as folderService from "./service.js";
import { folderOf } from "./middleware.js";
import { createFolderSchema, listFoldersQuerySchema, updateFolderSchema } from "./validation.js";

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

    if (parentFolderId !== undefined && parentFolderId !== null) {
        const parent = await folderService.getLiveFolder(folder.workspaceId, parentFolderId);
        if (!parent) throw ApiError.notFound("Parent folder not found");

        // A move is the only way to introduce a cycle; creation can't, since a new
        // folder has no descendants. An undetected cycle would hang every recursive
        // CTE that walks this tree.
        const subtreeIds = await folderService.getFolderSubtreeIds(folder.id);
        if (subtreeIds.includes(parentFolderId)) {
            throw ApiError.badRequest("Cannot move a folder into itself or one of its descendants");
        }
    }

    const updated = await folderService.updateFolder(folder.id, {
        ...(name !== undefined && { name }),
        ...(parentFolderId !== undefined && { parentFolderId }),
    });

    return ApiResponse.success(res, "Folder updated", updated);
}

export async function deleteFolder(req: Request<FolderParams>, res: Response) {
    const folder = folderOf(req);

    if (folder.deletedAt) throw ApiError.notFound("Folder not found");

    const deletedBatchId = await folderService.softDeleteFolder(folder.id);

    return ApiResponse.success(res, "Folder moved to trash", { deletedBatchId });
}

export async function restoreFolder(req: Request<FolderParams>, res: Response) {
    const folder = folderOf(req);

    if (!folder.deletedAt || !folder.deletedBatchId) {
        throw ApiError.badRequest("Folder is not in the trash");
    }

    // Restoring under a still-trashed parent would produce a live folder that no
    // tree query can reach, so the parent has to come back first.
    if (folder.parentFolderId) {
        const parentDeleted = await folderService.isFolderDeleted(folder.parentFolderId);
        if (parentDeleted) {
            throw ApiError.conflict("Restore the parent folder first");
        }
    }

    await folderService.restoreBatch(folder.deletedBatchId);

    return ApiResponse.success(res, "Folder restored", { deletedBatchId: folder.deletedBatchId });
}
