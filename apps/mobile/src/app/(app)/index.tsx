import React from "react";
import { Text, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "expo-router";
import { DrawerActions } from "@react-navigation/native";

import useTheme from "@/lib/theme/useTheme";

export default function Index() {
    const navigation = useNavigation();
    const { theme, themeMode } = useTheme();

    return (
        <>
            <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={styles.buttonContainer}>
                    <Pressable
                        onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
                        style={[
                            styles.menuButton,
                            { backgroundColor: theme.inputBg, borderColor: theme.subtleBorder },
                        ]}
                    >
                        <Text style={[styles.menuIcon, { color: theme.foreground }]}>☰</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    buttonContainer: {
        paddingHorizontal: 16,
        alignItems: "flex-start",
    },
    menuButton: {
        width: 44,
        height: 44,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    menuIcon: {
        fontSize: 20,
    },
    content: {
        flex: 1,
        padding: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    signOutButton: {
        marginTop: 20,
        padding: 12,
        backgroundColor: "#ff4444",
        borderRadius: 8,
    },
    signOutText: {
        color: "#fff",
        fontWeight: "600",
    },
});
