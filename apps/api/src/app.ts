import express, { type Application } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import env from "./shared/config/env.js";

export default function createServerApplication(): Application {
    const app = express();

    app.use(express.json());
    app.use(cookieParser());
    app.use(
        cors({
            origin: env.CLIENT_URL,
            credentials: true,
        }),
    );

    app.get("/api/ping", (_req, res) => {
        return res.status(200).json({
            message: "Cognis Server is working.",
        });
    });

    return app;
}
