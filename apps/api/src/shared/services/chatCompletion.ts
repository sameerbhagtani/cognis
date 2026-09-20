import { maxOutputTokensFor, streamChatCompletion } from "../../lib/ai/chat.js";
import { assemblePrompt, type HistoryTurn } from "../../lib/ai/prompt.js";
import { appendMessage, listMessages } from "../../modules/chat/service.js";
import { emitToChat } from "../../realtime/emitter.js";
import { AI_MODELS } from "../config/ai.js";
import { checkBudget, recordUsage } from "./aiUsage.js";
import { buildWorkspaceContext } from "./retrieval.js";

type GenerateInput = {
    chatId: string;
    workspaceId: string;
    userId: string;
    /** Chosen by the caller and already returned to the client, so the stream
     *  can be followed before the row exists. */
    assistantMessageId: string;
    question: string;
};

/**
 * Produces the answer to the question that was just stored.
 *
 * Runs after the HTTP response has gone out, so it can never reject into the
 * request. Every failure is reported to the chat's room instead, and anything
 * unexpected is logged rather than left to take the process down.
 *
 * The assistant's message is written when generation finishes, whether or not
 * anybody is still listening. The socket carries a convenience; the row is the
 * record. A client that drops mid-answer reloads the chat and finds it there.
 */
export async function generateAssistantReply({
    chatId,
    workspaceId,
    userId,
    assistantMessageId,
    question,
}: GenerateInput): Promise<void> {
    try {
        const stored = await listMessages(chatId);

        // Everything before the question that triggered this.
        const history: HistoryTurn[] = stored
            .slice(0, -1)
            .map((message) => ({ role: message.role, content: message.content }));

        const context = await buildWorkspaceContext({
            workspaceId,
            userId,
            question,
            history,
        });

        const prompt = assemblePrompt({ context, history, question });

        // Re-read after retrieval, which may itself have spent a little on
        // rewriting a follow-up.
        const budget = await checkBudget(userId, "completion");
        const maxOutputTokens = maxOutputTokensFor(
            Math.max(0, budget.limitMicros - budget.spentMicros),
        );

        emitToChat(chatId, "chat:message_started", { chatId, messageId: assistantMessageId });

        const result = await streamChatCompletion({
            messages: prompt.messages,
            maxOutputTokens,
            onToken: (delta) =>
                emitToChat(chatId, "chat:token", {
                    chatId,
                    messageId: assistantMessageId,
                    delta,
                }),
        });

        // The spend is recorded either way — it happened — but an empty answer is
        // not worth keeping in the conversation. The budget gate should have
        // caught this; if something still comes back blank, say so rather than
        // leaving a silent gap in the chat.
        if (!result.content.trim()) {
            await recordUsage({
                userId,
                workspaceId,
                kind: "completion",
                model: AI_MODELS.chat,
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
            });

            emitToChat(chatId, "chat:error", {
                chatId,
                messageId: assistantMessageId,
                message: "The reply came back empty. Please try again.",
            });

            return;
        }

        // Cite only what the answer could actually have drawn on.
        const citedNoteIds = context.citedNoteIds;

        await appendMessage({
            id: assistantMessageId,
            chatId,
            role: "assistant",
            content: result.content,
            citedNoteIds,
        });

        await recordUsage({
            userId,
            workspaceId,
            kind: "completion",
            model: AI_MODELS.chat,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            messageId: assistantMessageId,
        });

        emitToChat(chatId, "chat:message_completed", {
            chatId,
            messageId: assistantMessageId,
            content: result.content,
            citedNoteIds,
            truncated: result.finishReason === "length",
        });
    } catch (err) {
        console.error(`generating a reply for chat ${chatId} failed`, err);

        emitToChat(chatId, "chat:error", {
            chatId,
            messageId: assistantMessageId,
            message: "Could not generate a reply. Please try again.",
        });
    }
}
