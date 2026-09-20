import { useRef, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import useTheme from "@/lib/theme/useTheme";

import type { Theme } from "@cognis/types";

type PromptDialogProps = {
    visible: boolean;
    title: string;
    placeholder: string;
    /** Prefilled for a rename, empty when creating. */
    initialValue?: string;
    confirmLabel: string;
    onConfirm: (value: string) => Promise<void> | void;
    onClose: () => void;
};

/** Alert.prompt is iOS-only, so names are collected in a dialog of our own. */
export function PromptDialog({
    visible,
    title,
    placeholder,
    initialValue = "",
    confirmLabel,
    onConfirm,
    onClose,
}: PromptDialogProps) {
    const { theme } = useTheme();
    const styles = createStyles(theme);

    const inputRef = useRef<TextInput>(null);
    const [value, setValue] = useState(initialValue);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const trimmed = value.trim();
    const canSubmit = trimmed.length > 0 && !isSubmitting;

    async function submit() {
        if (!canSubmit) return;

        setIsSubmitting(true);
        try {
            await onConfirm(trimmed);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            // Remounts on each open so the field starts from initialValue rather
            // than whatever was typed the last time it was used.
            key={`${title}:${initialValue}`}
            // autoFocus doesn't fire for an input inside a Modal - the field
            // mounts before the modal is presented, so focus lands on nothing.
            // onShow alone isn't enough on Android either: it fires while the
            // animation is still running. blur-then-focus, one tick after the
            // animation, is the combination that actually takes.
            onShow={() => {
                setTimeout(() => {
                    inputRef.current?.blur();
                    inputRef.current?.focus();
                }, 120);
            }}
        >
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.dialog} onPress={() => {}}>
                    <Text style={styles.title}>{title}</Text>

                    <TextInput
                        ref={inputRef}
                        value={value}
                        onChangeText={setValue}
                        placeholder={placeholder}
                        placeholderTextColor={theme.subtleBorder}
                        maxLength={50}
                        autoCapitalize="sentences"
                        autoCorrect={false}
                        onSubmitEditing={() => void submit()}
                        style={styles.input}
                    />

                    <View style={styles.actions}>
                        <Pressable onPress={onClose} style={styles.cancel}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </Pressable>

                        <Pressable
                            onPress={() => void submit()}
                            disabled={!canSubmit}
                            style={({ pressed }) => [
                                styles.confirm,
                                { opacity: !canSubmit ? 0.5 : pressed ? 0.85 : 1 },
                            ]}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#ffffff" size="small" />
                            ) : (
                                <Text style={styles.confirmText}>{confirmLabel}</Text>
                            )}
                        </Pressable>
                    </View>
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
            backgroundColor: theme.background,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.subtleBorder,
            padding: 20,
            gap: 16,
        },
        title: {
            fontSize: 16,
            fontWeight: "600",
            color: theme.foreground,
        },
        input: {
            height: 48,
            borderWidth: 1.5,
            borderColor: theme.subtleBorder,
            borderRadius: 12,
            paddingHorizontal: 14,
            fontSize: 16,
            color: theme.foreground,
            backgroundColor: theme.inputBg,
        },
        actions: {
            flexDirection: "row",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 8,
        },
        cancel: {
            paddingVertical: 12,
            paddingHorizontal: 16,
        },
        cancelText: {
            fontSize: 15,
            color: theme.foreground,
            opacity: 0.7,
        },
        confirm: {
            minWidth: 96,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 10,
            backgroundColor: theme.primary,
            alignItems: "center",
        },
        confirmText: {
            fontSize: 15,
            fontWeight: "700",
            color: "#ffffff",
        },
    });
}
