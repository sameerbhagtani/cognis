import { z } from "zod";

import normalizeEmail from "../../shared/utils/normalizeEmail.js";

// "owner" is deliberately excluded: a workspace has exactly one owner, and
// ownership transfer has no endpoint in Phase 1.
const assignableRole = z.enum(["editor", "viewer"]);

/**
 * The one definition of an invite address. Normalizing here rather than in each
 * consumer is what keeps the rate-limit key and the user lookup on the same
 * string — they were derived separately before, and only one of them lowercased.
 *
 * Normalize first, then validate, so the address that gets checked is the one
 * that will actually be queried. Validating first would reject a pasted address
 * with a trailing space before the trim ever ran.
 */
export const memberEmailSchema = z.string().transform(normalizeEmail).pipe(z.email());

export const addMemberSchema = z.object({
    email: memberEmailSchema,
    role: assignableRole,
});

export const updateMemberRoleSchema = z.object({
    role: assignableRole,
});

/**
 * Reads the invite address out of a not-yet-validated body, for the rate-limit
 * key. The limiter runs ahead of the handler's own parse, so this is the only
 * way to key on the same value the handler will use.
 *
 * Anything invalid returns undefined and skips the limiter, which costs nothing:
 * the request is about to fail validation and no mail will be sent.
 */
export function parseInviteEmail(body: unknown): string | undefined {
    const result = memberEmailSchema.safeParse((body as { email?: unknown })?.email);

    return result.success ? result.data : undefined;
}
