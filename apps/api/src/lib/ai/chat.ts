import { openai } from "./openai.js";
import { AI_MODELS, CHAT, MODEL_PRICES } from "../../shared/config/ai.js";
import type { PromptMessage } from "./prompt.js";

export type StreamResult = {
    content: string;
    inputTokens: number;
    outputTokens: number;
    /** "length" means the answer was cut off by the token cap. */
    finishReason: string | null;
};

/**
 * The largest answer the remaining allowance can pay for.
 *
 * Usage is only known after a call returns, so exact pre-authorisation is
 * impossible. Capping the answer is what bounds the overshoot: a caller with
 * almost nothing left gets a short reply rather than an open-ended one.
 */
export function maxOutputTokensFor(remainingMicros: number): number {
    const microsPerToken = MODEL_PRICES[AI_MODELS.chat].output / 1_000_000;
    const affordable = Math.floor(remainingMicros / microsPerToken);

    return Math.max(1, Math.min(CHAT.maxOutputTokens, affordable));
}

/**
 * Streams an answer, handing each fragment to onToken as it arrives.
 *
 * stream_options.include_usage is not optional here. Without it a streamed
 * response carries no usage at all, and every message would be metered as
 * costing nothing — the ledger would quietly disagree with the invoice.
 *
 * The full text is accumulated and returned regardless of what onToken does
 * with it, because the database is the source of truth for a message and the
 * stream is only a convenience for whoever happens to be watching.
 */
export async function streamChatCompletion({
    messages,
    maxOutputTokens,
    onToken,
}: {
    messages: PromptMessage[];
    maxOutputTokens: number;
    onToken: (delta: string) => void;
}): Promise<StreamResult> {
    const stream = await openai.chat.completions.create({
        model: AI_MODELS.chat,
        messages,
        max_completion_tokens: maxOutputTokens,
        stream: true,
        stream_options: { include_usage: true },
    });

    let content = "";
    let inputTokens = 0;
    let outputTokens = 0;
    let finishReason: string | null = null;

    for await (const chunk of stream) {
        const choice = chunk.choices[0];

        const delta = choice?.delta?.content;
        if (delta) {
            content += delta;
            onToken(delta);
        }

        if (choice?.finish_reason) finishReason = choice.finish_reason;

        // Arrives on a final chunk that carries no choices.
        if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens;
            outputTokens = chunk.usage.completion_tokens;
        }
    }

    return { content, inputTokens, outputTokens, finishReason };
}
