import { StatusBar } from "expo-status-bar";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import useTheme from "@/lib/theme/useTheme";

export default function Index() {
    const { themeMode, setTheme, theme } = useTheme();

    return (
        <SafeAreaView>
            <StatusBar style={themeMode === "dark" ? "light" : "dark"} />

            <View style={{ backgroundColor: theme.background }}>
                <Text style={{ color: theme.foreground }}>Cognis: Mobile App</Text>
            </View>

            <Pressable onPress={() => setTheme("dark")}>
                <Text>Dark</Text>
            </Pressable>

            <Pressable onPress={() => setTheme("system")}>
                <Text>System</Text>
            </Pressable>

            <Pressable onPress={() => setTheme("light")}>
                <Text>Light</Text>
            </Pressable>
        </SafeAreaView>
    );
}
