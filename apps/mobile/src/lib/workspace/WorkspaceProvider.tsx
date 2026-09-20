import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Alert } from "react-native";

import { ApiClientError } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { getSocket } from "@/lib/socket";
import { asyncStorage, STORAGE_KEYS } from "@/lib/storage";
import { fetchWorkspaces } from "@/modules/workspace/api";
import WorkspaceContext from "./WorkspaceContext";

import type { Workspace, WorkspaceRole } from "@/modules/workspace/types";

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
    const { data: session } = authClient.useSession();
    const userId = session?.user.id ?? null;

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

    // Read inside socket handlers, which subscribe once per active workspace
    // and would otherwise close over the list as it was when they were set up.
    // Needed only to name a workspace in a message *before* refresh drops it.
    const workspacesRef = useRef(workspaces);
    useEffect(() => {
        workspacesRef.current = workspaces;
    });

    /**
     * Losing access is the one workspace change the user has to be told about,
     * because it moves them somewhere they didn't ask to go. Everything else
     * reconciles quietly: `refresh` refetches `/workspaces`, which returns each
     * workspace with the caller's current role and omits any they can no longer
     * see, so one call settles a rename, a demotion, a removal or a deletion.
     *
     * Only the active workspace's room is joined (see NotesProvider), so these
     * events can only ever concern that workspace - which is what lets
     * member:removed and member:role_changed be acted on at all, since their
     * payloads carry a userId but no workspaceId.
     */
    useEffect(() => {
        if (!activeId || !userId) return;

        let cancelled = false;

        function nameOf(id: string) {
            return workspacesRef.current.find((workspace) => workspace.id === id)?.name;
        }

        const onWorkspaceUpdated = () => void refresh();

        const onWorkspaceDeleted = (payload: { id: string }) => {
            const deleted = workspacesRef.current.find((workspace) => workspace.id === payload.id);

            void refresh();

            // The room includes whoever acted, so this also comes back to the
            // person who pressed Delete. Only an owner can delete a workspace
            // and there is exactly one, so an owned workspace disappearing is
            // always our own doing - and needs no announcement.
            if (!deleted || deleted.ownerId === userId) return;

            Alert.alert("Workspace deleted", `${deleted.name} was deleted by its owner.`);
        };

        const onMemberRemoved = (payload: { userId: string }) => {
            if (payload.userId !== userId) return;

            const name = nameOf(activeId);

            void refresh();
            Alert.alert(
                "Removed from workspace",
                `You no longer have access to ${name ?? "that workspace"}.`,
            );
        };

        // Not announced: a demotion changes what the app offers, and the
        // controls disappearing says it more plainly than a dialog would. The
        // refresh is what matters - the editor reads canWrite from this role.
        const onMemberRoleChanged = (payload: { userId: string; role: WorkspaceRole }) => {
            if (payload.userId !== userId) return;

            void refresh();
        };

        void getSocket().then((socket) => {
            if (cancelled) return;

            socket.on("workspace:updated", onWorkspaceUpdated);
            socket.on("workspace:deleted", onWorkspaceDeleted);
            socket.on("member:removed", onMemberRemoved);
            socket.on("member:role_changed", onMemberRoleChanged);
        });

        return () => {
            cancelled = true;

            void getSocket().then((socket) => {
                socket.off("workspace:updated", onWorkspaceUpdated);
                socket.off("workspace:deleted", onWorkspaceDeleted);
                socket.off("member:removed", onMemberRemoved);
                socket.off("member:role_changed", onMemberRoleChanged);
            });
        };
    }, [activeId, userId, refresh]);

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
