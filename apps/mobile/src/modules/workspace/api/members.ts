import { api } from "@/lib/api";

import type { ApiSuccess } from "@/lib/api";
import type { AssignableRole, WorkspaceMember } from "../types";

/**
 * The invitee must already have a Cognis account - the API answers 404 "User
 * not found" otherwise, and 409 if they're already a member. Both surface as
 * an ApiClientError carrying the API's own message.
 */
export async function inviteMember(
    workspaceId: string,
    email: string,
    role: AssignableRole,
): Promise<WorkspaceMember> {
    const { data } = await api.post<ApiSuccess<WorkspaceMember>>(
        `/workspaces/${workspaceId}/members`,
        { email, role },
    );

    return data.data;
}
