import { useCallback, useEffect, useState } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { ApiClientError } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { CONTENT_MAX_WIDTH } from "@/lib/hooks/useLayout";
import useTheme from "@/lib/theme/useTheme";
import { useWorkspace } from "@/lib/workspace";
import { ActionSheet, PromptDialog, ScreenHeader, type SheetAction } from "@/modules/drawer";
import {
    deleteWorkspace,
    fetchMembers,
    removeMember,
    renameWorkspace,
    updateMemberRole,
} from "../api";
import { InviteMemberDialog } from "../components/InviteMemberDialog";
import { MemberRow } from "../components/MemberRow";

import type { Theme } from "@cognis/types";
import type { AssignableRole, WorkspaceMemberDetail } from "../types";

export default function WorkspaceSettings({ workspaceId }: { workspaceId: string }) {
    const { theme } = useTheme();
    const router = useRouter();
    const { data: session } = authClient.useSession();
    const { workspaces, activeWorkspace, refresh, selectWorkspace } = useWorkspace();

    const styles = createStyles(theme);

    // The list already carries the caller's role per workspace, so this needs
    // no fetch of its own - and it covers workspaces other than the active one,
    // which is the whole point of addressing this screen by id.
    const workspace = workspaces.find((candidate) => candidate.id === workspaceId) ?? null;
    const isOwner = workspace?.role === "owner";

    const [members, setMembers] = useState<WorkspaceMemberDetail[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [renaming, setRenaming] = useState(false);
    const [inviting, setInviting] = useState(false);
    const [selected, setSelected] = useState<WorkspaceMemberDetail | null>(null);

    const loadMembers = useCallback(async () => {
        try {
            setMembers(await fetchMembers(workspaceId));
            setLoadError(null);
        } catch (err) {
            setLoadError(err instanceof ApiClientError ? err.message : "Could not load members");
        }
    }, [workspaceId]);

    useEffect(() => {
        let cancelled = false;

        fetchMembers(workspaceId)
            .then((fetched) => {
                if (cancelled) return;

                setMembers(fetched);
            })
            .catch((err: unknown) => {
                if (cancelled) return;

                setLoadError(
                    err instanceof ApiClientError ? err.message : "Could not load members",
                );
            });

        return () => {
            cancelled = true;
        };
    }, [workspaceId]);

    async function runMemberAction(action: () => Promise<void>) {
        setActionError(null);

        try {
            await action();
            await loadMembers();
        } catch (err) {
            setActionError(err instanceof ApiClientError ? err.message : "That didn't work");
        }
    }

    async function onRename(name: string) {
        try {
            await renameWorkspace(workspaceId, name);
            await refresh();
        } catch (err) {
            setActionError(err instanceof ApiClientError ? err.message : "Could not rename");
        }
    }

    function confirmDelete() {
        Alert.alert(
            "Delete workspace?",
            `"${workspace?.name}" and every note, folder and chat inside it will be deleted. This cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => void performDelete() },
            ],
        );
    }

    async function performDelete() {
        try {
            await deleteWorkspace(workspaceId);

            // Leave before the list refetches, so nothing re-renders against a
            // workspace that no longer exists.
            const fallback = workspaces.find((candidate) => candidate.id !== workspaceId);
            if (fallback && workspaceId === activeWorkspace?.id) selectWorkspace(fallback.id);

            await refresh();
            router.replace("/");
        } catch (err) {
            setActionError(err instanceof ApiClientError ? err.message : "Could not delete");
        }
    }

    // The owner's own row is the one the API refuses to touch, so it gets no
    // menu rather than a menu whose every option 400s.
    function onSelectMember(member: WorkspaceMemberDetail) {
        if (!isOwner || member.role === "owner") return;

        setSelected(member);
    }

    function memberActions(member: WorkspaceMemberDetail): SheetAction[] {
        const nextRole: AssignableRole = member.role === "editor" ? "viewer" : "editor";

        return [
            {
                label: nextRole === "editor" ? "Make editor" : "Make viewer",
                icon: nextRole === "editor" ? "pencil-outline" : "eye-outline",
                onPress: () =>
                    void runMemberAction(() =>
                        updateMemberRole(workspaceId, member.id, nextRole).then(() => undefined),
                    ),
            },
            {
                label: "Remove from workspace",
                icon: "account-remove-outline",
                destructive: true,
                onPress: () => void runMemberAction(() => removeMember(workspaceId, member.id)),
            },
        ];
    }

    if (!workspace) {
        return (
            <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
                <ScreenHeader title="Workspace" />
                <View style={styles.centered}>
                    <Text style={styles.error}>This workspace is no longer available.</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            <ScreenHeader title="Workspace" />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Name</Text>

                    {isOwner ? (
                        <Pressable
                            onPress={() => setRenaming(true)}
                            style={({ pressed }) => [
                                styles.nameRow,
                                { opacity: pressed ? 0.7 : 1 },
                            ]}
                        >
                            <Text style={styles.name}>{workspace.name}</Text>
                            <MaterialCommunityIcons
                                name="pencil-outline"
                                size={18}
                                color={theme.foreground}
                            />
                        </Pressable>
                    ) : (
                        <Text style={styles.name}>{workspace.name}</Text>
                    )}

                    <Text style={styles.caption}>
                        You are {workspace.role === "owner" ? "the owner" : `a ${workspace.role}`}.
                    </Text>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Members</Text>

                        {isOwner && (
                            <Pressable
                                onPress={() => setInviting(true)}
                                hitSlop={8}
                                style={({ pressed }) => [
                                    styles.inviteButton,
                                    { opacity: pressed ? 0.6 : 1 },
                                ]}
                            >
                                <MaterialCommunityIcons
                                    name="account-plus-outline"
                                    size={16}
                                    color={theme.primary}
                                />
                                <Text style={styles.inviteText}>Invite</Text>
                            </Pressable>
                        )}
                    </View>

                    {actionError && <Text style={styles.error}>{actionError}</Text>}

                    {loadError ? (
                        <Text style={styles.error}>{loadError}</Text>
                    ) : !members ? (
                        <ActivityIndicator color={theme.primary} />
                    ) : (
                        members.map((member) => (
                            <MemberRow
                                key={member.id}
                                member={member}
                                isYou={member.user.id === session?.user.id}
                                actionable={isOwner && member.role !== "owner"}
                                onPress={() => onSelectMember(member)}
                            />
                        ))
                    )}
                </View>

                {isOwner && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Danger zone</Text>

                        <Pressable
                            onPress={confirmDelete}
                            style={({ pressed }) => [
                                styles.deleteButton,
                                { opacity: pressed ? 0.7 : 1 },
                            ]}
                        >
                            <Text style={styles.deleteText}>Delete workspace</Text>
                        </Pressable>
                    </View>
                )}
            </ScrollView>

            {/* Mounted only while open, not toggled by `visible`: the dialog
             *  seeds its input from initialValue on mount, so keeping it
             *  mounted would reopen it holding an abandoned draft. Same reason
             *  FileTree mounts its dialogs conditionally. */}
            {renaming && (
                <PromptDialog
                    visible
                    title="Rename workspace"
                    placeholder="Workspace name"
                    initialValue={workspace.name}
                    confirmLabel="Save"
                    onConfirm={onRename}
                    onClose={() => setRenaming(false)}
                />
            )}

            {inviting && (
                <InviteMemberDialog
                    workspaceId={workspaceId}
                    workspaceName={workspace.name}
                    onInvited={() => void loadMembers()}
                    onClose={() => setInviting(false)}
                />
            )}

            <ActionSheet
                visible={selected !== null}
                title={selected?.user.name ?? ""}
                actions={selected ? memberActions(selected) : []}
                onClose={() => setSelected(null)}
            />
        </SafeAreaView>
    );
}

function createStyles(theme: Theme) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.background,
        },
        centered: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
        },
        content: {
            paddingHorizontal: 16,
            paddingVertical: 16,
            gap: 28,
            width: "100%",
            maxWidth: CONTENT_MAX_WIDTH,
            alignSelf: "center",
        },
        section: {
            gap: 12,
        },
        sectionHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
        },
        sectionTitle: {
            fontSize: 12,
            fontWeight: "600",
            letterSpacing: 0.8,
            textTransform: "uppercase",
            color: theme.foreground,
            opacity: 0.5,
        },
        nameRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
        },
        name: {
            flex: 1,
            fontSize: 20,
            fontWeight: "700",
            color: theme.foreground,
        },
        caption: {
            fontSize: 12,
            color: theme.foreground,
            opacity: 0.45,
        },
        inviteButton: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingVertical: 4,
        },
        inviteText: {
            fontSize: 13,
            fontWeight: "600",
            color: theme.primary,
        },
        error: {
            fontSize: 13,
            color: theme.danger,
        },
        deleteButton: {
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: `${theme.danger}80`,
            backgroundColor: `${theme.danger}1a`,
            alignItems: "center",
        },
        deleteText: {
            fontSize: 15,
            fontWeight: "600",
            color: theme.danger,
        },
    });
}
