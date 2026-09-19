import { z } from "zod";

// "owner" is deliberately excluded: a workspace has exactly one owner, and
// ownership transfer has no endpoint in Phase 1.
const assignableRole = z.enum(["editor", "viewer"]);

export const addMemberSchema = z.object({
    email: z.email(),
    role: assignableRole,
});

export const updateMemberRoleSchema = z.object({
    role: assignableRole,
});
