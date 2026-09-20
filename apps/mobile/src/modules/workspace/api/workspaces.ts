import { api } from "@/lib/api";

import type { ApiSuccess } from "@/lib/api";
import type { Workspace } from "../types";

/**
 * Responses are typed as the success shape alone: a failure never returns from
 * here, the client's interceptor rejects it as an ApiClientError first.
 */
export async function fetchWorkspaces(): Promise<Workspace[]> {
    const { data } = await api.get<ApiSuccess<Workspace[]>>("/workspaces");

    return data.data;
}

export async function createWorkspace(name: string): Promise<Workspace> {
    const { data } = await api.post<ApiSuccess<Workspace>>("/workspaces", { name });

    return data.data;
}

/** Owner only. Emits workspace:updated to everyone in the workspace's room. */
export async function renameWorkspace(workspaceId: string, name: string): Promise<Workspace> {
    const { data } = await api.patch<ApiSuccess<Workspace>>(`/workspaces/${workspaceId}`, { name });

    return data.data;
}

/** Owner only, and takes everything inside the workspace with it. */
export async function deleteWorkspace(workspaceId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}`);
}
