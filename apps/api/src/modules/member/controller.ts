import * as memberService from "./service.js";
import { addMemberSchema, updateMemberRoleSchema } from "./validation.js";

import { getWorkspaceMembership } from "../../shared/services/workspaceAccess.js";
import ApiError from "../../shared/utils/ApiError.js";
import ApiResponse from "../../shared/utils/ApiResponse.js";
import parseUuidParam from "../../shared/utils/parseUuidParam.js";

import type { Request, Response } from "express";

type WorkspaceParams = { workspaceId: string };
type MemberParams = WorkspaceParams & { memberId: string };

export async function listMembers(req: Request<WorkspaceParams>, res: Response) {
    const members = await memberService.listMembers(req.params.workspaceId);

    return ApiResponse.success(res, "Members fetched", members);
}

export async function addMember(req: Request<WorkspaceParams>, res: Response) {
    const { workspaceId } = req.params;
    const body = addMemberSchema.parse(req.body);

    const user = await memberService.findUser(
        "userId" in body ? { userId: body.userId } : { email: body.email },
    );

    if (!user) throw ApiError.notFound("User not found");

    const existing = await getWorkspaceMembership(workspaceId, user.id);
    if (existing) throw ApiError.conflict("User is already a member of this workspace");

    const member = await memberService.addMember(workspaceId, user.id, body.role);

    return ApiResponse.created(res, "Member added", member);
}

export async function updateMemberRole(req: Request<MemberParams>, res: Response) {
    const { workspaceId } = req.params;
    const memberId = parseUuidParam(req.params.memberId, "memberId");
    const { role } = updateMemberRoleSchema.parse(req.body);

    const member = await memberService.getMemberById(workspaceId, memberId);
    if (!member) throw ApiError.notFound("Member not found");

    // requireWorkspaceOwner guarantees the caller is the owner, so a member row
    // pointing at the caller is the owner's own row.
    if (member.userId === req.user.id) {
        throw ApiError.badRequest("Cannot change the workspace owner's role");
    }

    const updated = await memberService.updateMemberRole(memberId, role);

    return ApiResponse.success(res, "Member role updated", updated);
}

export async function removeMember(req: Request<MemberParams>, res: Response) {
    const { workspaceId } = req.params;
    const memberId = parseUuidParam(req.params.memberId, "memberId");

    const member = await memberService.getMemberById(workspaceId, memberId);
    if (!member) throw ApiError.notFound("Member not found");

    if (member.userId === req.user.id) {
        throw ApiError.badRequest("Cannot remove the workspace owner");
    }

    await memberService.removeMember(memberId);

    return ApiResponse.noContent(res);
}
