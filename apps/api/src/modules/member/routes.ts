import { Router } from "express";

import * as memberController from "./controller.js";

import requireWorkspaceOwner from "../../shared/middlewares/requireWorkspaceOwner.js";
import requireWorkspaceRole from "../../shared/middlewares/requireWorkspaceRole.js";
import { MEMBER_ROLES } from "../../shared/services/workspaceAccess.js";

// mergeParams exposes :workspaceId from the parent workspace router.
const router = Router({ mergeParams: true });

router.get("/", requireWorkspaceRole(MEMBER_ROLES), memberController.listMembers);
router.post("/", requireWorkspaceOwner, memberController.addMember);
router.patch("/:memberId", requireWorkspaceOwner, memberController.updateMemberRole);
router.delete("/:memberId", requireWorkspaceOwner, memberController.removeMember);

export default router;
