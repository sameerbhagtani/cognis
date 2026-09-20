import { Router } from "express";

import * as memberController from "./controller.js";
import { parseInviteEmail } from "./validation.js";

import requireWorkspaceOwner from "../../shared/middlewares/requireWorkspaceOwner.js";
import requireWorkspaceRole from "../../shared/middlewares/requireWorkspaceRole.js";
import { MEMBER_ROLES } from "../../shared/services/workspaceAccess.js";
import { rateLimitMemberInvite } from "../../shared/middlewares/rateLimit.js";

// Keyed off the same schema the handler parses with, so the limiter and the user
// lookup can't disagree about what the address is.
const limitMemberInvite = rateLimitMemberInvite((req) => parseInviteEmail(req.body));

// mergeParams exposes :workspaceId from the parent workspace router.
const router = Router({ mergeParams: true });

router.get("/", requireWorkspaceRole(MEMBER_ROLES), memberController.listMembers);
router.post("/", requireWorkspaceOwner, limitMemberInvite, memberController.addMember);
router.patch("/:memberId", requireWorkspaceOwner, memberController.updateMemberRole);
router.delete("/:memberId", requireWorkspaceOwner, memberController.removeMember);

export default router;
