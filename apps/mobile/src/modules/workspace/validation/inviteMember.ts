import * as z from "zod";

export const inviteMemberSchema = z.object({
    email: z.email("Please enter a valid email address"),
    // "owner" is deliberately absent - a workspace has exactly one owner and
    // nothing transfers ownership.
    role: z.enum(["editor", "viewer"]),
});

export type InviteMemberFormData = z.infer<typeof inviteMemberSchema>;
