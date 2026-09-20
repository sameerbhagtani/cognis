import { KeyboardAvoidingView, Platform } from "react-native";

import InviteMember from "@/modules/workspace/screens/InviteMember";

export default function InviteMemberRoute() {
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
        >
            <InviteMember />
        </KeyboardAvoidingView>
    );
}
