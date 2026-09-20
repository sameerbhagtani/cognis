import ApiError from "./ApiError.js";

type PgConstraintError = {
    code: string;
    constraint?: string;
};

/**
 * Drizzle wraps driver failures in a DrizzleQueryError and hangs the pg
 * DatabaseError off `cause`, so the constraint details live one level down. The
 * wrapper's own message embeds the SQL and its bound parameters, which is a
 * second reason to read named fields rather than pass the message along.
 */
function pgConstraintError(err: unknown): PgConstraintError | null {
    const cause = (err as { cause?: unknown })?.cause;
    const code = (cause as { code?: unknown })?.code;

    if (typeof code !== "string") return null;

    const constraint = (cause as { constraint?: unknown })?.constraint;

    return { code, constraint: typeof constraint === "string" ? constraint : undefined };
}

const FOREIGN_KEY_VIOLATION = "23503";
const UNIQUE_VIOLATION = "23505";

function mapConstraintCode(code: string): ApiError | null {
    switch (code) {
        case FOREIGN_KEY_VIOLATION:
            return ApiError.notFound();
        case UNIQUE_VIOLATION:
            return ApiError.conflict("Already exists");
        default:
            return null;
    }
}

/**
 * Maps the two constraint failures a well-formed request can still hit. Both are
 * races rather than bad input, which is why they can't be validated away:
 *
 * - A foreign key violation means a row the request referenced was deleted while
 *   it was running — a workspace removed midway through creating a folder in it.
 *   A retry would find it missing too, so it reads as a 404 rather than a
 *   conflict, and matches what every other "workspace is gone" path returns.
 * - A unique violation means someone inserted the same row first. That is what
 *   check-then-insert looks like when it loses, as two concurrent invites for
 *   one person would.
 *
 * Anything else stays unmapped and falls through to a 500: a not-null or check
 * violation is a fault on our side, not something the caller can act on.
 */
export default function mapDatabaseError(err: unknown): ApiError | null {
    const dbError = pgConstraintError(err);
    if (!dbError) return null;

    const mapped = mapConstraintCode(dbError.code);
    if (!mapped) return null;

    // Warned rather than swallowed: these should be rare, and a regression in one
    // of the pre-checks would otherwise surface only as a quiet 404. Code and
    // constraint name only — the driver's message carries the bound parameters.
    console.warn(
        `database constraint violation ${dbError.code} on ${dbError.constraint ?? "unknown constraint"}`,
    );

    return mapped;
}
