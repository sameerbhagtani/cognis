import { z, ZodError } from "zod";

import ApiError from "../utils/ApiError.js";

import type { NextFunction, Request, Response } from "express";

// The 4th parameter is required: Express only treats a middleware as an error
// handler when its arity is exactly 4.
export default function errorHandler(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
) {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
    }

    // express.json() rejects unparseable bodies with a SyntaxError carrying the raw body.
    if (err instanceof SyntaxError && "body" in err) {
        return res.status(400).json({
            success: false,
            message: "Malformed JSON body",
        });
    }

    // treeifyError over flattenError: flatten drops everything to formErrors on
    // union schemas, which would leave the client with no usable detail.
    if (err instanceof ZodError) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: z.treeifyError(err),
        });
    }

    console.error(err);

    return res.status(500).json({
        success: false,
        message: "Internal server error",
    });
}
