import { Router } from "express";

import workspaceRoutes from "./workspace/routes.js";
import { folderRoutes } from "./folder/routes.js";
import { noteRoutes } from "./note/routes.js";
import { trashRoutes } from "./trash/routes.js";

import requireAuth from "../shared/middlewares/requireAuth.js";
import { rateLimitByIp, rateLimitByUser } from "../shared/middlewares/rateLimit.js";

const router = Router();

// Ahead of requireAuth so an unauthenticated flood can't hammer the session
// lookup; the per-user limit then does the real work once the caller is known.
router.use(rateLimitByIp);

// Every module route below is authenticated; req.user is typed non-optional on that basis.
router.use(requireAuth);

router.use(rateLimitByUser);

router.use("/workspaces", workspaceRoutes);
router.use("/folders", folderRoutes);
router.use("/notes", noteRoutes);
router.use("/trash", trashRoutes);

export default router;
