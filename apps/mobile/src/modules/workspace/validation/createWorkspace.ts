import * as z from "zod";

// Mirrors apps/api/src/modules/workspace/validation.ts, so the client rejects
// what the server would reject rather than waiting for a round trip.
export const createWorkspaceSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Give the workspace a name")
        .max(50, "Name must be at most 50 characters"),
});

export type CreateWorkspaceFormData = z.infer<typeof createWorkspaceSchema>;
