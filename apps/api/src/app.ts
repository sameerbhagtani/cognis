import express, { type Application } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";

import apiRoutes from "./modules/index.js";

import notFoundHandler from "./shared/middlewares/notFoundHandler.js";
import errorHandler from "./shared/middlewares/errorHandler.js";

import env from "./shared/config/env.js";

export default function createServerApplication(): Application {
    const app = express();

    app.use(
        cors({
            origin: env.CLIENT_URL,
            credentials: true,
        }),
    );

    // Must stay ahead of express.json(): Better Auth reads the raw request body.
    app.all("/api/auth/*splat", toNodeHandler(auth));

    // Notes are free-form text; body-parser's 100kb default is low for a long one.
    app.use(express.json({ limit: "1mb" }));
    app.use(cookieParser());

    app.get("/api/health", (_req, res) => {
        return res.status(200).json({ status: "ok" });
    });

    app.use("/api", apiRoutes);

    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}
