import { db, eq, getColumns, schemas } from "@cognis/database";

export async function createWorkspace(ownerId: string, name: string) {
    return db.transaction(async (tx) => {
        const [created] = await tx.insert(schemas.workspace).values({ ownerId, name }).returning();

        await tx.insert(schemas.workspaceMember).values({
            workspaceId: created.id,
            userId: ownerId,
            role: "owner",
        });

        return created;
    });
}

export async function listWorkspacesForUser(userId: string) {
    return db
        .select({
            ...getColumns(schemas.workspace),
            role: schemas.workspaceMember.role,
        })
        .from(schemas.workspaceMember)
        .innerJoin(schemas.workspace, eq(schemas.workspace.id, schemas.workspaceMember.workspaceId))
        .where(eq(schemas.workspaceMember.userId, userId))
        .orderBy(schemas.workspace.name);
}

export async function getWorkspaceById(workspaceId: string) {
    const [workspace] = await db
        .select()
        .from(schemas.workspace)
        .where(eq(schemas.workspace.id, workspaceId))
        .limit(1);

    return workspace ?? null;
}

export async function renameWorkspace(workspaceId: string, name: string) {
    const [updated] = await db
        .update(schemas.workspace)
        .set({ name })
        .where(eq(schemas.workspace.id, workspaceId))
        .returning();

    return updated;
}

export async function deleteWorkspace(workspaceId: string) {
    await db.delete(schemas.workspace).where(eq(schemas.workspace.id, workspaceId));
}
