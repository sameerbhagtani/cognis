import { Router } from "express";

import { usageSummary } from "../../shared/services/aiUsage.js";
import ApiResponse from "../../shared/utils/ApiResponse.js";

import type { Request, Response } from "express";

const router = Router();

/**
 * What the caller has spent and how much is left, so a client can show it
 * rather than discovering the ceiling by hitting it.
 */
router.get("/ai-usage", async (req: Request, res: Response) => {
    return ApiResponse.success(res, "Usage fetched", await usageSummary(req.user.id));
});

export default router;
