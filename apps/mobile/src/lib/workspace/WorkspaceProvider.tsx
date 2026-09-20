import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { ApiClientError } from "@/lib/api";
import { asyncStorage, STORAGE_KEYS } from "@/lib/storage";
import { fetchWorkspaces } from "@/modules/workspace/api";
import WorkspaceContext from "./WorkspaceContext";

import type { Workspace } from "@/modules/workspace/types";

function describeError(err: unknown): string {
    return err instanceof ApiClientError ? err.message : "Could not load your workspaces";
}

/**
 * Falls back to the first workspace whenever the preferred one isn't in the
 * list - deleted, access revoked, or simply a different account signed in on
 * this device, since the remembered id outlives any one session.
 */
function resolveActiveId(list: Workspace[], preferred: string | null): string | null {
    return list.find((workspace) => workspace.id === preferred)?.id ?? list[0]?.id ?? null;
}

export default function WorkspaceProvider({ children }: { children: ReactNode }) {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State is set from the promise callbacks rather than the effect body, and
    // skipped entirely if this unmounted while the request was in flight.
    useEffect(() => {
        let cancelled = false;

        Promise.all([fetchWorkspaces(), asyncStorage.getItem(STORAGE_KEYS.activeWorkspaceId)])
            .then(([list, stored]) => {
                if (cancelled) return;

                setWorkspaces(list);
                setActiveId(resolveActiveId(list, stored));
                setError(null);
            })
            .catch((err: unknown) => {
                if (cancelled) return;

                setError(describeError(err));
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    // Called from handlers, never during render, so setting state directly is
    // fine here. Deliberately doesn't flip isLoading back on: a refresh
    // shouldn't blank a sidebar that already has content.
    const refresh = useCallback(async () => {
        try {
            const list = await fetchWorkspaces();

            setWorkspaces(list);
            setActiveId((current) => resolveActiveId(list, current));
            setError(null);
        } catch (err) {
            setError(describeError(err));
        }
    }, []);

    const value = useMemo(() => {
        function selectWorkspace(workspaceId: string) {
            setActiveId(workspaceId);
            void asyncStorage.setItem(STORAGE_KEYS.activeWorkspaceId, workspaceId);
        }

        return {
            workspaces,
            activeWorkspace: workspaces.find((workspace) => workspace.id === activeId) ?? null,
            isLoading,
            error,
            selectWorkspace,
            refresh,
        };
    }, [workspaces, activeId, isLoading, error, refresh]);

    return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
