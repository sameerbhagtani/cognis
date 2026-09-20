import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import useTheme from "@/lib/theme/useTheme";
import { handleSignout } from "@/modules/auth/api";
import { ScreenHeader } from "@/modules/drawer";

import type { Theme } from "@cognis/types";

/**
 * Deliberately thin for now - the theme switcher and AI usage belong here too,
 * and land in their own phase. Sign out lives here rather than bolted onto the
 * editor's header, which is where it was parked while there was nowhere else.
 */
export default function SettingsRoute() {
    const { theme } = useTheme();
    const styles = createStyles(theme);

    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            <ScreenHeader title="Settings" />

            <View style={styles.body}>
                <Pressable
                    onPress={() => void handleSignout()}
                    style={({ pressed }) => [styles.signOut, { opacity: pressed ? 0.7 : 1 }]}
                >
                    <Text style={styles.signOutText}>Sign out</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

function createStyles(theme: Theme) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.background,
        },
        body: {
            flex: 1,
            padding: 16,
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
