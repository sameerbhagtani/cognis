import { Router } from "express";

import workspaceRoutes from "./workspace/routes.js";
import { folderRoutes } from "./folder/routes.js";
import { noteRoutes } from "./note/routes.js";
import { trashRoutes } from "./trash/routes.js";

import requireAuth from "../shared/middlewares/requireAuth.js";

const router = Router();

// Every module route below is authenticated; req.user is typed non-optional on that basis.
router.use(requireAuth);

router.use("/workspaces", workspaceRoutes);
router.use("/folders", folderRoutes);
router.use("/notes", noteRoutes);
router.use("/trash", trashRoutes);

export default router;
