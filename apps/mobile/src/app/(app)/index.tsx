import { Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { handleSignout } from "@/modules/auth/api";

export default function index() {
    return (
        <SafeAreaView>
            <Text>This is the main app</Text>

            <Pressable onPress={handleSignout}>
                <Text>Sign Out</Text>
            </Pressable>
        </SafeAreaView>
    );
}
