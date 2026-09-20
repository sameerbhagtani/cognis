import { z } from "zod";

export const createChatSchema = z.object({
    title: z.string().trim().min(1).max(100).optional(),
});

/**
 * Capped well below the body limit. A question is a question; anything longer is
 * a note, and pasting a document into the chat would be billed as input on
 * every subsequent turn of the conversation.
 */
export const sendMessageSchema = z.object({
    content: z.string().trim().min(1).max(4000),
});
