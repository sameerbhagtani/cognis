import { z } from "zod";

const folderName = z.string().trim().min(1).max(50);

export const createFolderSchema = z.object({
    name: folderName,
    parentFolderId: z.guid().nullish(),
});

// name and parentFolderId are both optional so a request can rename, move, or do
// both. parentFolderId: null is a move to the workspace root, which is why it has
// to stay distinguishable from the key being absent.
export const updateFolderSchema = z
    .object({
        name: folderName.optional(),
        parentFolderId: z.guid().nullable().optional(),
    })
    .refine((data) => data.name !== undefined || data.parentFolderId !== undefined, {
        message: "Provide name and/or parentFolderId",
    });

// "null" selects root-level folders; omitting the param returns the whole workspace.
export const listFoldersQuerySchema = z.object({
    parentFolderId: z.union([z.guid(), z.literal("null")]).optional(),
});
