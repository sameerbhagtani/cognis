import { z } from "zod";

// "owner" is deliberately excluded: a workspace has exactly one owner, and
// ownership transfer has no endpoint in Phase 1.
const assignableRole = z.enum(["editor", "viewer"]);

// strictObject on both branches is what enforces "exactly one of": supplying
// userId and email together matches neither branch instead of silently
// stripping one. The union also makes the parsed result narrowable.
export const addMemberSchema = z.union([
    z.strictObject({ userId: z.string().trim().min(1), role: assignableRole }),
    z.strictObject({ email: z.email(), role: assignableRole }),
]);

export const updateMemberRoleSchema = z.object({
    role: assignableRole,
});
