import { CHAT } from "../../shared/config/ai.js";
import type { ContextSource, WorkspaceContext } from "../../shared/services/retrieval.js";
import { estimateTokens } from "./chunk.js";

export type PromptRole = "system" | "user" | "assistant";

export type PromptMessage = {
    role: PromptRole;
    content: string;
};

export type HistoryTurn = {
    role: "user" | "assistant";
    content: string;
};

export type AssembledPrompt = {
    messages: PromptMessage[];
    citedNoteIds: string[];
    strategy: WorkspaceContext["strategy"];
    estimatedInputTokens: number;
    historyTurnsUsed: number;
    historyTruncated: boolean;
};

const BASE_INSTRUCTIONS = `You are Cognis, answering questions about one workspace of the user's own notes.

Ground every answer in the notes you are given. Where they do not contain the answer, say so plainly instead of guessing — the user would far rather learn that a note is missing than read something invented.

Refer to notes by their titles.

Be concise. Answer in prose unless the user asks for a list.`;

/**
 * The two paths can promise different things, and saying otherwise makes the
 * model offer what the plumbing cannot deliver.
 *
 * On the inline path it has every note in full, so "shall I look at that one?"
 * is nonsense — it already has. On the retrieved path it holds excerpts plus
 * the index, so offering is right: a follow-up is rewritten into a standalone
 * query before the next search, which is what makes the offer keepable.
 */
const STRATEGY_INSTRUCTIONS = {
    inline: `Every note in this workspace is included below, in full. You are not working from excerpts, so never offer to "look at" or "read" a note — you already have all of them. If something is not in these notes, it is not in the workspace.`,
    retrieved: `This workspace is too large to include whole, so you have been given the excerpts most relevant to the question, plus an index naming every note. If the answer is likely to sit in a note you were not shown, name that note and offer to read it. Say yes to that offer and the next message will include it.`,
} as const;

function renderNoteIndex(context: WorkspaceContext): string {
    if (context.noteIndex.length === 0) {
        return "This workspace has no notes yet.";
    }

    const lines = context.noteIndex.map((entry) => `- ${entry.title}`).join("\n");
    const suffix = context.noteIndexTruncated
        ? `\n(Only the ${context.noteIndex.length} most recently updated notes are listed.)`
        : "";

    return `Notes in this workspace:\n${lines}${suffix}`;
}

function renderSources(sources: ContextSource[]): string {
    return sources.map((source) => `## ${source.title}\n\n${source.content}`).join("\n\n---\n\n");
}

/**
 * Keeps the most recent turns that fit, oldest-first within the result.
 *
 * Dropping from the front is what makes a long chat forget its own beginning.
 * Summarising the dropped turns is the usual remedy and costs another model
 * call, which is deferred until real conversations show it is needed.
 */
function trimHistory(history: HistoryTurn[]): { turns: HistoryTurn[]; truncated: boolean } {
    const recent = history.slice(-CHAT.maxHistoryTurns * 2);

    const kept: HistoryTurn[] = [];
    let tokens = 0;

    for (let i = recent.length - 1; i >= 0; i -= 1) {
        const turn = recent[i];
        const cost = estimateTokens(turn.content);

        if (tokens + cost > CHAT.maxHistoryTokens) break;

        tokens += cost;
        kept.unshift(turn);
    }

    return { turns: kept, truncated: kept.length < history.length };
}

/**
 * Builds the message list, ordered so the unchanging part comes first.
 *
 * OpenAI discounts input it has already seen, but only where the *beginning* of
 * the prompt matches. So the system message holds everything stable for the life
 * of a chat — the instructions and the note index — and anything that differs
 * per question goes last.
 *
 * That is also why inlined notes sit in the system message while retrieved
 * chunks sit with the question. On the inline path the notes are the same every
 * turn and belong in the cacheable prefix; retrieved chunks change with each
 * question and would ruin the prefix if placed there.
 *
 * History lands in between, which keeps the prefix stable as a chat grows, since
 * earlier turns never change. Trimming does break that once a conversation is
 * long enough to drop its oldest turns.
 */
export function assemblePrompt({
    context,
    history,
    question,
}: {
    context: WorkspaceContext;
    history: HistoryTurn[];
    question: string;
}): AssembledPrompt {
    const systemParts = [
        BASE_INSTRUCTIONS,
        STRATEGY_INSTRUCTIONS[context.strategy],
        renderNoteIndex(context),
    ];

    if (context.strategy === "inline" && context.sources.length > 0) {
        systemParts.push(
            `Full contents of every note in this workspace:\n\n${renderSources(context.sources)}`,
        );
    }

    const { turns, truncated } = trimHistory(history);

    const questionParts: string[] = [];

    if (context.strategy === "retrieved" && context.sources.length > 0) {
        questionParts.push(
            `Excerpts from this workspace that may be relevant:\n\n${renderSources(context.sources)}`,
        );
    }

    questionParts.push(`Question: ${question}`);

    const messages: PromptMessage[] = [
        { role: "system", content: systemParts.join("\n\n") },
        ...turns.map((turn) => ({ role: turn.role, content: turn.content })),
        { role: "user", content: questionParts.join("\n\n---\n\n") },
    ];

    return {
        messages,
        citedNoteIds: context.citedNoteIds,
        strategy: context.strategy,
        estimatedInputTokens: messages.reduce(
            (total, message) => total + estimateTokens(message.content),
            0,
        ),
        historyTurnsUsed: turns.length,
        historyTruncated: truncated,
    };
}
