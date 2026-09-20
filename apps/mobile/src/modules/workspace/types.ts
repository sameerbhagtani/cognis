/**
 * Mirrors what the API returns for a workspace - see
 * apps/api/src/modules/workspace/service.ts. Timestamps are strings here, not
 * Dates: they arrive as JSON and nothing revives them.
 */
export type WorkspaceRole = "owner" | "editor" | "viewer";

/** Only these two can be handed out; a workspace has exactly one owner. */
export type AssignableRole = Exclude<WorkspaceRole, "owner">;

export type Workspace = {
    id: string;
    ownerId: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    role: WorkspaceRole;
};

export type WorkspaceMember = {
    id: string;
    workspaceId: string;
    userId: string;
    role: WorkspaceRole;
    createdAt: string;
    updatedAt: string;
};

/**
 * What `GET /workspaces/:id/members` returns, which is a different shape from
 * the row `POST` gives back: it joins the user in and leaves out workspaceId
 * and updatedAt. Sorted by the user's name, server-side.
 */
export type WorkspaceMemberDetail = {
    id: string;
    role: WorkspaceRole;
    createdAt: string;
    user: {
        id: string;
        name: string;
        email: string;
        image: string | null;
    };
};
