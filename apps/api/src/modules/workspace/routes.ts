import { Router } from "express";

import * as workspaceController from "./controller.js";
import memberRoutes from "../member/routes.js";
import { workspaceFolderRoutes } from "../folder/routes.js";
import { workspaceNoteRoutes } from "../note/routes.js";

import requireWorkspaceOwner from "../../shared/middlewares/requireWorkspaceOwner.js";
import requireWorkspaceRole from "../../shared/middlewares/requireWorkspaceRole.js";
import { MEMBER_ROLES } from "../../shared/services/workspaceAccess.js";

const router = Router();

router.post("/", workspaceController.createWorkspace);
router.get("/", workspaceController.listWorkspaces);

router.get("/:workspaceId", requireWorkspaceRole(MEMBER_ROLES), workspaceController.getWorkspace);
router.patch("/:workspaceId", requireWorkspaceOwner, workspaceController.renameWorkspace);
router.delete("/:workspaceId", requireWorkspaceOwner, workspaceController.deleteWorkspace);

router.use("/:workspaceId/members", memberRoutes);
router.use("/:workspaceId/folders", workspaceFolderRoutes);
router.use("/:workspaceId/notes", workspaceNoteRoutes);

export default router;
