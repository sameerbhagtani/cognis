import { fromNodeHeaders } from "better-auth/node";

import { auth } from "../../lib/auth.js";
import ApiError from "../utils/ApiError.js";

import type { NextFunction, Request, Response } from "express";

export default async function requireAuth(req: Request, _res: Response, next: NextFunction) {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });

    if (!session) throw ApiError.unauthorized();

    req.user = session.user;
    req.session = session.session;

    next();
}
