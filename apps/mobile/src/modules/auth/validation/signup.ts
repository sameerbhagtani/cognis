import * as z from "zod";

export const signUpschema = z.object({
    name: z
        .string()
        .min(3, "Name must be at least 3 characters")
        .max(22, "Name must be at most 22 characters"),
    email: z.email("Please enter a valid email address").min(6).max(31),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignUpFormData = z.infer<typeof signUpschema>;
