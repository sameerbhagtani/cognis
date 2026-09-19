import { z } from "zod";

const noteTitle = z.string().trim().min(1).max(50);

export const createNoteSchema = z.object({
    title: noteTitle,
    content: z.string().nullish(),
    folderId: z.guid().nullish(),
});

// Every field is optional so a request can rename, edit, move, or combine them.
// folderId: null moves the note to the workspace root, so it has to stay
// distinguishable from the key being absent.
export const updateNoteSchema = z
    .object({
        title: noteTitle.optional(),
        content: z.string().nullable().optional(),
        folderId: z.guid().nullable().optional(),
    })
    .refine(
        (data) =>
            data.title !== undefined || data.content !== undefined || data.folderId !== undefined,
        { message: "Provide title, content and/or folderId" },
    );

// "null" selects notes at the workspace root; omitting it returns the whole workspace.
export const listNotesQuerySchema = z.object({
    folderId: z.union([z.guid(), z.literal("null")]).optional(),
});
