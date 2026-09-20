import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import useTheme from "@/lib/theme/useTheme";
import { ScreenHeader } from "@/modules/drawer";

import type { Theme } from "@cognis/types";

/** Placeholder so the drawer's AI mode has somewhere to go; built out in its own phase. */
export default function ChatRoute() {
    const { theme } = useTheme();
    const styles = createStyles(theme);

    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            <ScreenHeader title="AI" />

            <View style={styles.body}>
                <Text style={styles.placeholder}>Chat with your notes lands here.</Text>
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
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
        },
        placeholder: {
            fontSize: 14,
            color: theme.foreground,
            opacity: 0.5,
        },
    });
}
