import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiClientError } from "@/lib/api";
import { authClient } from "@/lib/auth";
import useTheme from "@/lib/theme/useTheme";
import { handleSignout } from "@/modules/auth/api";
import { ScreenHeader } from "@/modules/drawer";
import { fetchAiUsage } from "../api";
import { ThemePicker } from "../components/ThemePicker";
import { UsageBar } from "../components/UsageBar";

import type { Theme } from "@cognis/types";
import type { AiUsage } from "../types";

export default function SettingsScreen() {
    const { theme } = useTheme();
    const { data: session } = authClient.useSession();

    const styles = createStyles(theme);

    const [usage, setUsage] = useState<AiUsage | null>(null);
    const [usageError, setUsageError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        fetchAiUsage()
            .then((fetched) => {
                if (cancelled) return;

                setUsage(fetched);
            })
            .catch((err: unknown) => {
                if (cancelled) return;

                setUsageError(err instanceof ApiClientError ? err.message : "Could not load usage");
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            <ScreenHeader title="Settings" />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Appearance</Text>
                    <ThemePicker />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Email</Text>
                        <Text style={styles.fieldValue}>{session?.user.email ?? "—"}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>AI usage</Text>

                    {usageError ? (
                        <Text style={styles.error}>{usageError}</Text>
                    ) : !usage ? (
                        <ActivityIndicator color={theme.primary} />
                    ) : (
                        <>
                            <UsageBar label="Chat" bucket={usage.chat} />
                            <UsageBar label="Indexing" bucket={usage.indexing} />
                            {/* The window rolls rather than resetting on the
                             *  hour, so there's no single moment to count down
                             *  to - spend ages out continuously. */}
                            <Text style={styles.caption}>
                                Spend over a rolling {usage.windowHours}-hour window, in
                                micro-dollars (1 µ$ = $0.000001).
                            </Text>
                        </>
                    )}
                </View>

                <Pressable
                    onPress={() => void handleSignout()}
                    style={({ pressed }) => [styles.signOut, { opacity: pressed ? 0.7 : 1 }]}
                >
                    <Text style={styles.signOutText}>Sign out</Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}

function createStyles(theme: Theme) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.background,
        },
        content: {
            padding: 16,
            gap: 28,
        },
        section: {
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
        field: {
            gap: 3,
        },
        fieldLabel: {
            fontSize: 13,
            color: theme.foreground,
            opacity: 0.5,
        },
        fieldValue: {
            fontSize: 15,
            color: theme.foreground,
        },
        caption: {
            fontSize: 12,
            color: theme.foreground,
            opacity: 0.45,
        },
        error: {
            fontSize: 13,
            color: theme.danger,
        },
        signOut: {
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: `${theme.danger}80`,
            backgroundColor: `${theme.danger}1a`,
            alignItems: "center",
        },
        signOutText: {
            fontSize: 15,
            fontWeight: "600",
            color: theme.danger,
        },
    });
}
