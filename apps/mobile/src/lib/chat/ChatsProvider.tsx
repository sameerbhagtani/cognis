import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { ApiClientError } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { fetchChats } from "@/modules/chat/api";

import type { Chat } from "@/modules/chat/types";

export type ChatsContextType = {
    chats: Chat[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};

export const ChatsContext = createContext<ChatsContextType | undefined>(undefined);

/** Held per workspace, the same way the notes list is - see NotesProvider. */
type Loaded = {
    workspaceId: string;
    chats: Chat[];
    error: string | null;
};

const NO_CHATS: Chat[] = [];

function describeError(err: unknown): string {
    return err instanceof ApiClientError ? err.message : "Could not load your chats";
}

export default function ChatsProvider({ children }: { children: ReactNode }) {
    const { activeWorkspace } = useWorkspace();
    const workspaceId = activeWorkspace?.id ?? null;

    const [loaded, setLoaded] = useState<Loaded | null>(null);

    const isCurrent = loaded !== null && loaded.workspaceId === workspaceId;
    const chats = isCurrent ? loaded.chats : NO_CHATS;
    const error = isCurrent ? loaded.error : null;
    const isLoading = workspaceId !== null && !isCurrent;

    const refresh = useCallback(async () => {
        if (!workspaceId) return;

        try {
            setLoaded({ workspaceId, chats: await fetchChats(workspaceId), error: null });
        } catch (err) {
            setLoaded({ workspaceId, chats: NO_CHATS, error: describeError(err) });
        }
    }, [workspaceId]);

    useEffect(() => {
        if (!workspaceId) return;

        let cancelled = false;

        fetchChats(workspaceId)
            .then((nextChats) => {
                if (cancelled) return;

                setLoaded({ workspaceId, chats: nextChats, error: null });
            })
            .catch((err: unknown) => {
                if (cancelled) return;

                setLoaded({ workspaceId, chats: NO_CHATS, error: describeError(err) });
            });

        return () => {
            cancelled = true;
        };
    }, [workspaceId]);

    const value = useMemo(
        () => ({ chats, isLoading, error, refresh }),
        [chats, isLoading, error, refresh],
    );

    return <ChatsContext.Provider value={value}>{children}</ChatsContext.Provider>;
}
