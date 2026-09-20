import type { Workspace } from "@/modules/workspace/types";

export type WorkspaceContextType = {
    workspaces: Workspace[];
    /** Null only while loading, or when the user has no workspaces at all. */
    activeWorkspace: Workspace | null;
    isLoading: boolean;
    /** Set when the workspace list itself failed to load. */
    error: string | null;
    selectWorkspace: (workspaceId: string) => void;
    /** Refetches the list - call after creating one, or after a failed load. */
    refresh: () => Promise<void>;
};
