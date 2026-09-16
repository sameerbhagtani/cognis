import { and, eq, db, schemas } from "@cognis/database";
import ApiError from "../utils/ApiError.js";

export type WorkspaceRole = (typeof schemas.workspaceMemberRoleEnum.enumValues)[number];
export type WorkspaceMembership = typeof schemas.workspaceMember.$inferSelect;

export const MEMBER_ROLES: WorkspaceRole[] = [...schemas.workspaceMemberRoleEnum.enumValues];

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

/**
 * Owner-only actions check workspace.ownerId rather than the member role, since a
 * single NOT NULL FK can't drift the way a role value theoretically could.
 *
 * The join means a non-member and a non-existent workspace are indistinguishable
 * (both 404); only a member who isn't the owner gets a 403.
 */
export async function assertWorkspaceOwner(workspaceId: string, userId: string) {
    const [row] = await db
        .select({ ownerId: schemas.workspace.ownerId })
        .from(schemas.workspace)
        .innerJoin(
            schemas.workspaceMember,
            and(
                eq(schemas.workspaceMember.workspaceId, schemas.workspace.id),
                eq(schemas.workspaceMember.userId, userId),
            ),
        )
        .where(eq(schemas.workspace.id, workspaceId))
        .limit(1);

    if (!row) throw ApiError.notFound("Workspace not found");
    if (row.ownerId !== userId) throw ApiError.forbidden();
}
