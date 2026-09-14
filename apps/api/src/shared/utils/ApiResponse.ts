import type { Response } from "express";

export default class ApiResponse {
    static success<T>(res: Response, message = "Success", data?: T) {
        return res.status(200).json({
            success: true,
            message,
            data,
        });
    }

    static created<T>(res: Response, message = "Created successfully", data?: T) {
        return res.status(201).json({
            success: true,
            message,
            data,
        });
    }

    static noContent(res: Response) {
        return res.status(204).send();
    }
}
