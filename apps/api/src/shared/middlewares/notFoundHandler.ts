import ApiError from "../utils/ApiError.js";

import type { Request } from "express";

export default function notFoundHandler(req: Request) {
    throw ApiError.notFound(`Cannot ${req.method} ${req.originalUrl}`);
}
