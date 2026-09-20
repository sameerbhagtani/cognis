import { useLocalSearchParams } from "expo-router";

import ChatScreen from "@/modules/chat/screens/ChatScreen";

export default function ChatRoute() {
    const { chatId } = useLocalSearchParams<{ chatId: string }>();

    // Keyed by id so switching chats mounts a fresh thread rather than
    // reconciling one conversation's messages into another's.
    return <ChatScreen key={chatId} chatId={chatId} />;
}
