import { Router } from "express";

import workspaceRoutes from "./workspace/routes.js";

import requireAuth from "../shared/middlewares/requireAuth.js";

const router = Router();

// Every module route below is authenticated; req.user is typed non-optional on
// that basis.
router.use(requireAuth);

router.use("/workspaces", workspaceRoutes);

export default router;
