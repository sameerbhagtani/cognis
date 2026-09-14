import ApiError from "../utils/ApiError.js";

import type { Request, Response } from "express";

export default function errorHandler(err: Error, _req: Request, res: Response) {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
    }

    return res.status(500).json({
        success: false,
        message: "Internal server error",
    });
}
