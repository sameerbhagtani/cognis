import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Drawer } from "expo-router/drawer";

import useTheme from "@/lib/theme/useTheme";
import { useWorkspace, WorkspaceProvider } from "@/lib/workspace";
import { CustomDrawerContent } from "@/modules/drawer";
import CreateWorkspace from "@/modules/workspace/screens/CreateWorkspace";

export default function AppLayout() {
    return (
        <WorkspaceProvider>
            <AppShell />
        </WorkspaceProvider>
    );
}

/**
 * Split out so it can read the workspace context its own parent provides.
 *
 * A user with no workspaces gets the create screen in place of the app rather
 * than being navigated to it: there is nothing behind it to go back to, and the
 * shell swaps itself back in as soon as the list stops being empty.
 */
function AppShell() {
    const { theme } = useTheme();
    const { isLoading, workspaces } = useWorkspace();

    if (isLoading) {
        return (
            <View style={[styles.centered, { backgroundColor: theme.background }]}>
                <ActivityIndicator color={theme.primary} />
            </View>
        );
    }

    if (workspaces.length === 0) {
        return <CreateWorkspace onboarding />;
    }

    return (
        <Drawer
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
                headerShown: false,
                drawerStyle: { backgroundColor: theme.background },
            }}
        >
            <Drawer.Screen name="index" options={{ title: "Notes" }} />
            <Drawer.Screen name="chat" options={{ title: "AI" }} />
            <Drawer.Screen name="settings" options={{ title: "Settings" }} />
            <Drawer.Screen name="create-workspace" options={{ title: "New workspace" }} />
            <Drawer.Screen name="invite-member" options={{ title: "Invite" }} />
        </Drawer>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
});
