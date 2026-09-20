import { z, ZodError } from "zod";

import ApiError from "../utils/ApiError.js";
import mapDatabaseError from "../utils/databaseError.js";

import type { NextFunction, Request, Response } from "express";

// The 4th parameter is required: Express only treats a middleware as an error
// handler when its arity is exactly 4.
export default function errorHandler(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
) {
    // A constraint failure arrives wrapped by Drizzle, so it is translated first
    // and then reported by the ApiError branch like anything else. Unrecognised
    // database errors map to null and fall through to the 500.
    const error = mapDatabaseError(err) ?? err;

    if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message,
        });
    }

    // express.json() rejects unparseable bodies with a SyntaxError carrying the raw body.
    if (error instanceof SyntaxError && "body" in error) {
        return res.status(400).json({
            success: false,
            message: "Malformed JSON body",
        });
    }

    // Oversized bodies arrive as an http-errors 413; without this a long note
    // would be reported as a server fault.
    if ("type" in error && error.type === "entity.too.large") {
        return res.status(413).json({
            success: false,
            message: "Request body too large",
        });
    }

    // treeifyError over flattenError: flatten drops everything to formErrors on
    // union schemas, which would leave the client with no usable detail.
    if (error instanceof ZodError) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: z.treeifyError(error),
        });
    }

    console.error(error);

    return res.status(500).json({
        success: false,
        message: "Internal server error",
    });
}
