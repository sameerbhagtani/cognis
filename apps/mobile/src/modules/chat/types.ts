/** Mirrors the `chat` and `message` rows the API returns. */
export type Chat = {
    id: string;
    workspaceId: string;
    userId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
};

export type MessageRole = "user" | "assistant";

export type Message = {
    id: string;
    chatId: string;
    role: MessageRole;
    content: string;
    /** Notes the answer drew on. Null on user turns, and on answers that cited nothing. */
    citedNoteIds: string[] | null;
    createdAt: string;
};

export type ChatWithMessages = Chat & { messages: Message[] };

/** What POST /chats/:id/messages hands back - the answer itself arrives over the socket. */
export type SentMessage = {
    message: Message;
    /** The id the assistant's reply *will* have, so the stream can be followed early. */
    assistantMessageId: string;
};
