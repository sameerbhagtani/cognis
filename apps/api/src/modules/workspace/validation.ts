import { z } from "zod";

export const createWorkspaceSchema = z.object({
    name: z.string().trim().min(1).max(50),
});

export const renameWorkspaceSchema = z.object({
    name: z.string().trim().min(1).max(50),
});
