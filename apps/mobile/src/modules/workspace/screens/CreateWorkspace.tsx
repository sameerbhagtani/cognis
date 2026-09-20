import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    ScrollView,
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
import { createWorkspace } from "../api";
import { createWorkspaceSchema, type CreateWorkspaceFormData } from "../validation";

type CreateWorkspaceProps = {
    /** First-run: rendered in place of the app, with no way back to it yet. */
    onboarding?: boolean;
};

export default function CreateWorkspace({ onboarding = false }: CreateWorkspaceProps) {
    const { theme } = useTheme();
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;
    const router = useRouter();
    const { refresh, selectWorkspace } = useWorkspace();

    const styles = createAuthStyles(theme, isLandscape);

    const [focused, setFocused] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const {
        control,
        handleSubmit,
        formState: { errors, isValid, isSubmitting },
    } = useForm<CreateWorkspaceFormData>({
        resolver: zodResolver(createWorkspaceSchema),
        mode: "onTouched",
        reValidateMode: "onChange",
        defaultValues: { name: "" },
    });

    async function onSubmit(data: CreateWorkspaceFormData) {
        setApiError(null);

        try {
            const workspace = await createWorkspace(data.name);
            await refresh();
            selectWorkspace(workspace.id);

            // Onboarding has nothing to go back to - the layout swaps itself
            // for the app as soon as the list stops being empty.
            if (!onboarding) router.back();
        } catch (err) {
            setApiError(
                err instanceof ApiClientError ? err.message : "Could not create the workspace",
            );
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
                        <Text style={styles.title}>
                            {onboarding ? "Create your workspace" : "New workspace"}
                        </Text>
                        <Text style={styles.subtitle}>
                            {onboarding
                                ? "Everything in Cognis lives in a workspace - your notes, folders and chats."
                                : "Notes, folders and chats are scoped to the workspace they live in."}
                        </Text>
                    </View>

                    {apiError && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorTextGlobal}>{apiError}</Text>
                        </View>
                    )}

                    <View style={styles.fieldGroupLast}>
                        <Text style={styles.label}>Name</Text>
                        <Controller
                            control={control}
                            name="name"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    value={value}
                                    onChangeText={onChange}
                                    placeholder="Personal"
                                    placeholderTextColor={theme.subtleBorder}
                                    autoCapitalize="sentences"
                                    autoCorrect={false}
                                    maxLength={50}
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
                                                Boolean(errors.name),
                                            ),
                                        },
                                    ]}
                                />
                            )}
                        />
                        {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}
                    </View>

                    <Pressable
                        onPress={handleSubmit(onSubmit)}
                        disabled={!isValid || isSubmitting}
                        style={({ pressed }) => [
                            styles.button,
                            { opacity: !isValid || isSubmitting ? 0.5 : pressed ? 0.85 : 1 },
                        ]}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.buttonText}>Create workspace</Text>
                        )}
                    </Pressable>

                    {!onboarding && (
                        <View style={styles.footer}>
                            <Pressable onPress={() => router.back()}>
                                <Text style={styles.footerLink}>Cancel</Text>
                            </Pressable>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
