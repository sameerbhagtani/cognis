import * as z from "zod";

export const signInschema = z.object({
    email: z.email("Please enter a valid email address").min(6).max(31),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignInFormData = z.infer<typeof signInschema>;
