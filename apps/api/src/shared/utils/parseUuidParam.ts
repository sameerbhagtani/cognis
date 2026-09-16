import { z } from "zod";

import ApiError from "./ApiError.js";

// guid, not uuid: z.uuid() enforces RFC version/variant bits, which is stricter
// than Postgres's uuid type. Anything Postgres would accept should reach the
// query and come back as a normal 404 rather than a 400.
const uuidSchema = z.guid();

/**
 * Path params reach Postgres as-is, and comparing a non-UUID string against a
 * uuid column is a driver-level error (22P02), not an empty result. Rejecting
 * here keeps that from surfacing as a 500.
 */
export default function parseUuidParam(value: string, label: string): string {
    const result = uuidSchema.safeParse(value);

    if (!result.success) throw ApiError.badRequest(`Invalid ${label}`);

    return result.data;
}
