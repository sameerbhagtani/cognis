import { KeyboardAvoidingView, Platform } from "react-native";

import CreateWorkspace from "@/modules/workspace/screens/CreateWorkspace";

export default function CreateWorkspaceRoute() {
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
        >
            <CreateWorkspace />
        </KeyboardAvoidingView>
    );
}
