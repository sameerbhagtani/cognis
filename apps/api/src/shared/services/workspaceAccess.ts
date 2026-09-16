import { and, eq, db, schemas } from "@cognis/database";
import ApiError from "../utils/ApiError.js";

export type WorkspaceRole = (typeof schemas.workspaceMemberRoleEnum.enumValues)[number];
export type WorkspaceMembership = typeof schemas.workspaceMember.$inferSelect;

export async function getWorkspaceMembership(workspaceId: string, userId: string) {
    const [membership] = await db
        .select()
        .from(schemas.workspaceMember)
        .where(
            and(
                eq(schemas.workspaceMember.workspaceId, workspaceId),
                eq(schemas.workspaceMember.userId, userId),
            ),
        )
        .limit(1);

    return membership ?? null;
}

/**
 * Non-members get 404 rather than 403 so workspace existence isn't leaked.
 */
export async function assertWorkspaceRole(
    workspaceId: string,
    userId: string,
    allowedRoles: WorkspaceRole[],
): Promise<WorkspaceMembership> {
    const membership = await getWorkspaceMembership(workspaceId, userId);

    if (!membership) throw ApiError.notFound("Workspace not found");
    if (!allowedRoles.includes(membership.role)) throw ApiError.forbidden();

    return membership;
}
