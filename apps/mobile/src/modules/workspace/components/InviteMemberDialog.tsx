import { useRef, useState } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { ApiClientError } from "@/lib/api";
import useTheme from "@/lib/theme/useTheme";
import { getFieldBorderColor } from "@/modules/auth/styles";
import { inviteMember } from "../api";
import { inviteMemberSchema, type InviteMemberFormData } from "../validation";

import type { Theme } from "@cognis/types";
import type { AssignableRole } from "../types";

const ROLES: { value: AssignableRole; label: string; hint: string }[] = [
    { value: "viewer", label: "Viewer", hint: "Can read every note, and change nothing" },
    { value: "editor", label: "Editor", hint: "Can create and change notes and folders" },
];

type InviteMemberDialogProps = {
    workspaceId: string;
    workspaceName: string;
    /** Fired after a successful add, so the member list behind this refreshes. */
    onInvited: () => void;
    onClose: () => void;
};

/**
 * A dialog rather than a route. It used to be a screen, which meant the drawer
 * navigator kept it mounted after the first visit - so reopening it showed the
 * previous invite's success message, for someone who might since have been
 * removed. Mounted only while open, its state cannot outlive it.
 */
export function InviteMemberDialog({
    workspaceId,
    workspaceName,
    onInvited,
    onClose,
}: InviteMemberDialogProps) {
    const { theme } = useTheme();
    const styles = createStyles(theme);

    const inputRef = useRef<TextInput>(null);
    const [focused, setFocused] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [invited, setInvited] = useState<string | null>(null);

    const {
        control,
        handleSubmit,
        formState: { errors, isValid, isSubmitting },
    } = useForm<InviteMemberFormData>({
        resolver: zodResolver(inviteMemberSchema),
        mode: "onTouched",
        reValidateMode: "onChange",
        defaultValues: { email: "", role: "viewer" },
    });

    async function onSubmit(data: InviteMemberFormData) {
        setApiError(null);

        try {
            await inviteMember(workspaceId, data.email, data.role);
            setInvited(data.email);
            onInvited();
        } catch (err) {
            setApiError(err instanceof ApiClientError ? err.message : "Could not invite them");
        }
    }

    return (
        <Modal
            visible
            transparent
            animationType="fade"
            onRequestClose={onClose}
            // Same dance as PromptDialog: autoFocus doesn't take for an input
            // inside a Modal, and on Android onShow fires mid-animation.
            onShow={() => {
                setTimeout(() => {
                    inputRef.current?.blur();
                    inputRef.current?.focus();
                }, 120);
            }}
        >
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.dialog} onPress={() => {}}>
                    {invited ? (
                        <>
                            <Text style={styles.title}>Invited</Text>
                            <Text style={styles.success}>
                                {invited} was added to {workspaceName} and has been emailed about
                                it.
                            </Text>
                            <View style={styles.actions}>
                                <Pressable onPress={onClose} style={styles.confirm}>
                                    <Text style={styles.confirmText}>Done</Text>
                                </Pressable>
                            </View>
                        </>
                    ) : (
                        <>
                            <Text style={styles.title}>Invite to {workspaceName}</Text>
                            <Text style={styles.hint}>
                                They need a Cognis account already — invites don&apos;t create one.
                            </Text>

                            {apiError && (
                                <View style={styles.errorBox}>
                                    <Text style={styles.errorBoxText}>{apiError}</Text>
                                </View>
                            )}

                            <Controller
                                control={control}
                                name="email"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        ref={inputRef}
                                        value={value}
                                        onChangeText={onChange}
                                        placeholder="them@example.com"
                                        placeholderTextColor={theme.subtleBorder}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        onFocus={() => setFocused(true)}
                                        onBlur={() => {
                                            setFocused(false);
                                            onBlur();
                                        }}
                                        style={[
                                            styles.input,
                                            {
                                                borderColor: getFieldBorderColor(
                                                    theme,
                                                    focused,
                                                    Boolean(errors.email),
                                                ),
                                            },
                                        ]}
                                    />
                                )}
                            />
                            {errors.email && (
                                <Text style={styles.fieldError}>{errors.email.message}</Text>
                            )}

                            {/* Spelled out rather than a bare toggle, so the
                             *  owner can see exactly what each choice hands
                             *  over. */}
                            <Controller
                                control={control}
                                name="role"
                                render={({ field: { onChange, value } }) => (
                                    <View style={styles.roleGroup}>
                                        {ROLES.map((role) => {
                                            const selected = value === role.value;

                                            return (
                                                <Pressable
                                                    key={role.value}
                                                    onPress={() => onChange(role.value)}
                                                    style={({ pressed }) => [
                                                        styles.role,
                                                        selected && styles.roleSelected,
                                                        { opacity: pressed ? 0.8 : 1 },
                                                    ]}
                                                >
                                                    <View style={styles.roleHeader}>
                                                        <Text
                                                            style={
                                                                selected
                                                                    ? styles.roleLabelSelected
                                                                    : styles.roleLabel
                                                            }
                                                        >
                                                            {role.label}
                                                        </Text>
                                                        {selected && (
                                                            <MaterialCommunityIcons
                                                                name="check"
                                                                size={16}
                                                                color={theme.primary}
                                                            />
                                                        )}
                                                    </View>
                                                    <Text style={styles.roleHint}>{role.hint}</Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                )}
                            />

                            <View style={styles.actions}>
                                <Pressable onPress={onClose} style={styles.cancel}>
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </Pressable>

                                <Pressable
                                    onPress={handleSubmit(onSubmit)}
                                    disabled={!isValid || isSubmitting}
                                    style={({ pressed }) => [
                                        styles.confirm,
                                        {
                                            opacity:
                                                !isValid || isSubmitting ? 0.5 : pressed ? 0.85 : 1,
                                        },
                                    ]}
                                >
                                    {isSubmitting ? (
                                        <ActivityIndicator color="#ffffff" size="small" />
                                    ) : (
                                        <Text style={styles.confirmText}>Send invite</Text>
                                    )}
                                </Pressable>
                            </View>
                        </>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

function createStyles(theme: Theme) {
    return StyleSheet.create({
        backdrop: {
            flex: 1,
            backgroundColor: "#00000080",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 32,
        },
        dialog: {
            width: "100%",
            maxWidth: 400,
            gap: 12,
            padding: 20,
            borderRadius: 16,
            backgroundColor: theme.background,
        },
        title: {
            fontSize: 16,
            fontWeight: "600",
            color: theme.foreground,
        },
        hint: {
            fontSize: 13,
            color: theme.foreground,
            opacity: 0.55,
        },
        success: {
            fontSize: 14,
            lineHeight: 21,
            color: theme.foreground,
        },
        errorBox: {
            padding: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: `${theme.danger}80`,
            backgroundColor: `${theme.danger}1a`,
        },
        errorBoxText: {
            fontSize: 13,
            color: theme.danger,
            textAlign: "center",
        },
        input: {
            minHeight: 48,
            borderWidth: 1.5,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
            color: theme.foreground,
            backgroundColor: theme.inputBg,
        },
        fieldError: {
            fontSize: 12,
            color: theme.danger,
            marginTop: -6,
            marginLeft: 4,
        },
        roleGroup: {
            gap: 8,
        },
        role: {
            borderWidth: 1.5,
            borderColor: theme.subtleBorder,
            backgroundColor: theme.inputBg,
            borderRadius: 12,
            padding: 12,
        },
        roleSelected: {
            borderColor: theme.primary,
        },
        roleHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        roleLabel: {
            fontSize: 15,
            fontWeight: "600",
            color: theme.foreground,
        },
        roleLabelSelected: {
            fontSize: 15,
            fontWeight: "600",
            color: theme.primary,
        },
        roleHint: {
            fontSize: 13,
            color: theme.foreground,
            opacity: 0.6,
            marginTop: 2,
        },
        actions: {
            flexDirection: "row",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 8,
            marginTop: 4,
        },
        cancel: {
            paddingVertical: 10,
            paddingHorizontal: 14,
        },
        cancelText: {
            fontSize: 15,
            color: theme.foreground,
            opacity: 0.7,
        },
        confirm: {
            minWidth: 110,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.primary,
        },
        confirmText: {
            fontSize: 15,
            fontWeight: "700",
            color: "#ffffff",
        },
    });
}
