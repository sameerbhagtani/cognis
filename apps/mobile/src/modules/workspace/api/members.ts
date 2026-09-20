import { api } from "@/lib/api";

import type { ApiSuccess } from "@/lib/api";
import type { AssignableRole, WorkspaceMember, WorkspaceMemberDetail } from "../types";

/** Readable by any member, not just the owner - only the mutations below are
 *  owner-gated, so everyone can see who has access. */
export async function fetchMembers(workspaceId: string): Promise<WorkspaceMemberDetail[]> {
    const { data } = await api.get<ApiSuccess<WorkspaceMemberDetail[]>>(
        `/workspaces/${workspaceId}/members`,
    );

    return data.data;
}

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

/**
 * The API refuses to change the owner's own row (400), so the caller is
 * expected not to offer it - the guard is a backstop, not the UI's contract.
 */
export async function updateMemberRole(
    workspaceId: string,
    memberId: string,
    role: AssignableRole,
): Promise<WorkspaceMember> {
    const { data } = await api.patch<ApiSuccess<WorkspaceMember>>(
        `/workspaces/${workspaceId}/members/${memberId}`,
        { role },
    );

    return data.data;
}

/** Same rule as above: removing the owner is a 400. */
export async function removeMember(workspaceId: string, memberId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
}
