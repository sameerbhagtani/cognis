import { EMBEDDING_DIMENSIONS } from "@cognis/database";

import { openai } from "./openai.js";
import { AI_MODELS } from "../../shared/config/ai.js";

export type EmbeddingResult = {
    vectors: number[][];
    inputTokens: number;
};

/**
 * Embeds a batch in one request. Batching matters: the per-request overhead
 * dwarfs the per-token cost at these sizes, so a note's chunks go together.
 *
 * Token count comes from the API's own usage field rather than being estimated,
 * because this is what gets billed and what the ledger records.
 */
export async function embedTexts(texts: string[]): Promise<EmbeddingResult> {
    if (texts.length === 0) return { vectors: [], inputTokens: 0 };

    const response = await openai.embeddings.create({
        model: AI_MODELS.embedding,
        input: texts,
    });

    // Results carry their own index rather than being assumed in order.
    const vectors: number[][] = new Array<number[]>(texts.length);

    for (const item of response.data) vectors[item.index] = item.embedding;

    const missing = vectors.findIndex((vector) => vector === undefined);
    if (missing !== -1) throw new Error(`Embedding API returned no vector for input ${missing}`);

    // Caught here rather than as a Postgres type error three frames later: a
    // model whose output does not match the column is a configuration mistake,
    // and the message should say so.
    const wrong = vectors.find((vector) => vector.length !== EMBEDDING_DIMENSIONS);
    if (wrong) {
        throw new Error(
            `Model "${AI_MODELS.embedding}" returned ${wrong.length} dimensions, ` +
                `but note_chunk.embedding is vector(${EMBEDDING_DIMENSIONS})`,
        );
    }

    return { vectors, inputTokens: response.usage.prompt_tokens };
}
