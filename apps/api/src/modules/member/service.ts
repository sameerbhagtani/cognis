import { and, db, eq, schemas } from "@cognis/database";

import type { WorkspaceRole } from "../../shared/services/workspaceAccess.js";

export async function listMembers(workspaceId: string) {
    return db
        .select({
            id: schemas.workspaceMember.id,
            role: schemas.workspaceMember.role,
            createdAt: schemas.workspaceMember.createdAt,
            user: {
                id: schemas.user.id,
                name: schemas.user.name,
                email: schemas.user.email,
                image: schemas.user.image,
            },
        })
        .from(schemas.workspaceMember)
        .innerJoin(schemas.user, eq(schemas.user.id, schemas.workspaceMember.userId))
        .where(eq(schemas.workspaceMember.workspaceId, workspaceId))
        .orderBy(schemas.user.name);
}

export async function findUserByEmail(email: string) {
    const [user] = await db
        .select({ id: schemas.user.id, email: schemas.user.email })
        .from(schemas.user)
        .where(eq(schemas.user.email, email))
        .limit(1);

    return user ?? null;
}

export async function getMemberById(workspaceId: string, memberId: string) {
    const [member] = await db
        .select()
        .from(schemas.workspaceMember)
        .where(
            and(
                eq(schemas.workspaceMember.id, memberId),
                eq(schemas.workspaceMember.workspaceId, workspaceId),
            ),
        )
        .limit(1);

    return member ?? null;
}

export async function addMember(workspaceId: string, userId: string, role: WorkspaceRole) {
    const [created] = await db
        .insert(schemas.workspaceMember)
        .values({ workspaceId, userId, role })
        .returning();

    return created;
}

export async function updateMemberRole(memberId: string, role: WorkspaceRole) {
    const [updated] = await db
        .update(schemas.workspaceMember)
        .set({ role })
        .where(eq(schemas.workspaceMember.id, memberId))
        .returning();

    return updated;
}

export async function removeMember(memberId: string) {
    await db.delete(schemas.workspaceMember).where(eq(schemas.workspaceMember.id, memberId));
}
