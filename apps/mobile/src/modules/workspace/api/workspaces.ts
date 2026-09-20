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
