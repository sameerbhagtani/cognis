import * as z from "zod";

export const forgotPasswordSchema = z.object({
    email: z.email("Please enter a valid email address").min(6).max(31),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
