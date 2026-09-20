import { openai } from "./openai.js";
import { AI_MODELS, CHAT } from "../../shared/config/ai.js";
import type { HistoryTurn } from "./prompt.js";

export type CondenseResult = {
    /** What to search with — the rewrite, or the original if it was not needed. */
    question: string;
    rewritten: boolean;
    inputTokens: number;
    outputTokens: number;
};

const INSTRUCTIONS = `Rewrite the user's latest message as a standalone search query for their personal notes.

Resolve anything that only makes sense in context: "yes", "tell me more", "the second one", "why?". If the assistant just offered to read a named note and the user agreed, the query is that note's title and subject.

If the user has changed the subject, use only the new subject — do not carry the old one over.

Name the subject explicitly even when the message nearly stands alone. "why not row locks?" during a conversation about folder moves should become "why row locks do not prevent folder move cycles". A query that says what it is about retrieves far better than a fragment.

If the latest message is already a full, self-contained question, return it unchanged.

Reply with the query and nothing else. No quotes, no preamble.`;

/**
 * Turns a follow-up into something worth searching with.
 *
 * A short reply carries no meaning on its own: embedding "yes" and searching
 * for it returns effectively random chunks, so the note the assistant just
 * offered to read is no more likely to come back than before. The fix is to
 * search with what the user *meant*, which needs the conversation to work out.
 *
 * The obvious cheaper trick — embedding the previous turn glued to this one —
 * is avoided deliberately. It breaks on a change of subject, where the old
 * topic then pollutes the query and makes retrieval worse on the common path to
 * fix the uncommon one. A model reading the exchange handles that correctly.
 *
 * Never throws. A failed or slow rewrite falls back to the raw question, which
 * is exactly the behaviour without this step — degraded retrieval, not a broken
 * chat.
 */
export async function condenseQuestion(
    history: HistoryTurn[],
    question: string,
): Promise<CondenseResult> {
    const unchanged: CondenseResult = {
        question,
        rewritten: false,
        inputTokens: 0,
        outputTokens: 0,
    };

    if (history.length === 0) return unchanged;

    // Only the tail matters, and it bounds what this costs on a long chat.
    const recent = history.slice(-CHAT.condenseHistoryTurns * 2);

    try {
        const response = await openai.chat.completions.create({
            model: AI_MODELS.chat,
            max_completion_tokens: CHAT.condenseMaxOutputTokens,
            messages: [
                { role: "system", content: INSTRUCTIONS },
                ...recent.map((turn) => ({ role: turn.role, content: turn.content })),
                { role: "user", content: question },
            ],
        });

        const rewritten = response.choices[0]?.message?.content?.trim();
        const usage = response.usage;

        // An empty or absurdly long reply means it did something other than what
        // was asked, and the raw question is the safer input.
        if (!rewritten || rewritten.length > question.length + 300) {
            return {
                ...unchanged,
                inputTokens: usage?.prompt_tokens ?? 0,
                outputTokens: usage?.completion_tokens ?? 0,
            };
        }

        return {
            question: rewritten,
            rewritten: rewritten !== question,
            inputTokens: usage?.prompt_tokens ?? 0,
            outputTokens: usage?.completion_tokens ?? 0,
        };
    } catch (err) {
        console.warn("question rewrite failed, searching with the raw question", err);

        return unchanged;
    }
}
