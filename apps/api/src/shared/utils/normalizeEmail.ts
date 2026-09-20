/**
 * Better Auth lowercases the address before it writes a user row — createUser,
 * createOAuthUser and the sign-up route all do it — so every stored user.email
 * is lowercase. Anything that looks a user up by email, or keys a limiter on one,
 * has to match that or it silently misses the row.
 *
 * Idempotent, which is the point: applying it at more than one boundary is safe,
 * and is what keeps a lookup and a rate-limit key built from the same input from
 * disagreeing.
 */
export default function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}
