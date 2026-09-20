import { useState } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
    View,
    Text,
    TextInput,
    Pressable,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { ApiClientError } from "@/lib/api";
import useTheme from "@/lib/theme/useTheme";
import { useWorkspace } from "@/lib/workspace";
import { createAuthStyles, getFieldBorderColor } from "@/modules/auth/styles";
import { inviteMember } from "../api";
import { inviteMemberSchema, type InviteMemberFormData } from "../validation";

import type { Theme } from "@cognis/types";
import type { AssignableRole } from "../types";

const ROLES: { value: AssignableRole; label: string; hint: string }[] = [
    { value: "viewer", label: "Viewer", hint: "Can read every note, and change nothing" },
    { value: "editor", label: "Editor", hint: "Can create and change notes and folders" },
];

export default function InviteMember() {
    const { theme } = useTheme();
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;
    const router = useRouter();
    const { activeWorkspace } = useWorkspace();

    const styles = createAuthStyles(theme, isLandscape);
    const roleStyles = createRoleStyles(theme);

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
        if (!activeWorkspace) return;

        setApiError(null);

        try {
            await inviteMember(activeWorkspace.id, data.email, data.role);
            setInvited(data.email);
        } catch (err) {
            setApiError(err instanceof ApiClientError ? err.message : "Could not invite them");
        }
    }

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.formWrapper}>
                    <View style={styles.brandSection}>
                        <View style={styles.logoBox}>
                            <Text style={styles.logoGlyph}>C</Text>
                        </View>
                        <Text style={styles.title}>Invite someone</Text>
                        <Text style={styles.subtitle}>
                            {activeWorkspace
                                ? `They'll get access to everything in ${activeWorkspace.name}.`
                                : "They'll get access to everything in this workspace."}
                        </Text>
                    </View>

                    {invited ? (
                        <>
                            <Text style={styles.successText}>
                                {invited} was added and has been emailed about it.
                            </Text>
                            <View style={styles.footer}>
                                <Pressable onPress={() => router.back()}>
                                    <Text style={styles.footerLink}>Done</Text>
                                </Pressable>
                            </View>
                        </>
                    ) : (
                        <>
                            {apiError && (
                                <View style={styles.errorContainer}>
                                    <Text style={styles.errorTextGlobal}>{apiError}</Text>
                                </View>
                            )}

                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>Email</Text>
                                <Controller
                                    control={control}
                                    name="email"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <TextInput
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
                                    <Text style={styles.errorText}>{errors.email.message}</Text>
                                )}
                            </View>

                            {/* Spelled out rather than a bare toggle, so the owner can see
                             *  exactly what access each choice hands over. */}
                            <View style={styles.fieldGroupLast}>
                                <Text style={styles.label}>Access</Text>
                                <Controller
                                    control={control}
                                    name="role"
                                    render={({ field: { onChange, value } }) => (
                                        <View style={roleStyles.group}>
                                            {ROLES.map((role) => {
                                                const selected = value === role.value;

                                                return (
                                                    <Pressable
                                                        key={role.value}
                                                        onPress={() => onChange(role.value)}
                                                        style={({ pressed }) => [
                                                            roleStyles.option,
                                                            selected && roleStyles.optionSelected,
                                                            { opacity: pressed ? 0.8 : 1 },
                                                        ]}
                                                    >
                                                        <View style={roleStyles.optionHeader}>
                                                            <Text
                                                                style={
                                                                    selected
                                                                        ? roleStyles.optionLabelSelected
                                                                        : roleStyles.optionLabel
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
                                                        <Text style={roleStyles.optionHint}>
                                                            {role.hint}
                                                        </Text>
                                                    </Pressable>
                                                );
                                            })}
                                        </View>
                                    )}
                                />
                            </View>

                            <Pressable
                                onPress={handleSubmit(onSubmit)}
                                disabled={!isValid || isSubmitting || !activeWorkspace}
                                style={({ pressed }) => [
                                    styles.button,
                                    {
                                        opacity:
                                            !isValid || isSubmitting || !activeWorkspace
                                                ? 0.5
                                                : pressed
                                                  ? 0.85
                                                  : 1,
                                    },
                                ]}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color="#ffffff" />
                                ) : (
                                    <Text style={styles.buttonText}>Send invite</Text>
                                )}
                            </Pressable>

                            <View style={styles.footer}>
                                <Pressable onPress={() => router.back()}>
                                    <Text style={styles.footerLink}>Cancel</Text>
                                </Pressable>
                            </View>
                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

function createRoleStyles(theme: Theme) {
    return StyleSheet.create({
        group: {
            gap: 8,
        },
        optionLabel: {
            fontSize: 15,
            fontWeight: "600",
            color: theme.foreground,
        },
        option: {
            borderWidth: 1.5,
            borderColor: theme.subtleBorder,
            backgroundColor: theme.inputBg,
            borderRadius: 12,
            padding: 12,
        },
        optionSelected: {
            borderColor: theme.primary,
        },
        optionHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        optionLabelSelected: {
            fontSize: 15,
            fontWeight: "600",
            color: theme.primary,
        },
        optionHint: {
            fontSize: 13,
            color: theme.foreground,
            opacity: 0.6,
            marginTop: 2,
        },
    });
}
