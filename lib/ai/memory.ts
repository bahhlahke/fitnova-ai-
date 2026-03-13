import type { SupabaseClient } from "@supabase/supabase-js";

const OPENROUTER_EMBEDDINGS_URL = "https://openrouter.ai/api/v1/embeddings";

export interface MemoryMetadata {
    type: "workout" | "pr" | "injury" | "check-in" | "note";
    date: string;
    [key: string]: any;
}

/**
 * Generates an embedding for the given text using OpenAI via OpenRouter.
 */
export async function getEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set.");

    // Using text-embedding-3-small as default for cost/performance balance
    const res = await fetch(OPENROUTER_EMBEDDINGS_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: "openai/text-embedding-3-small",
            input: text.replace(/\n/g, " "),
        }),
    });

    if (!res.ok) {
        throw new Error(`Failed to generate embedding: ${res.statusText}`);
    }

    const data = await res.json();
    return data.data[0].embedding;
}

/**
 * Stores a piece of content in the long-term memory table.
 */
export async function storeMemory(
    supabase: SupabaseClient,
    userId: string,
    content: string,
    metadata: MemoryMetadata
) {
    const embedding = await getEmbedding(content);

    const { error } = await supabase.from("long_term_memory").insert({
        user_id: userId,
        content,
        embedding,
        metadata,
    });

    if (error) {
        console.error("store_memory_failed", { error, userId });
        throw error;
    }
}

/**
 * Queries the long-term memory table using vector similarity.
 */
export async function queryMemory(
    supabase: SupabaseClient,
    userId: string,
    query: string,
    limit: number = 5
) {
    const embedding = await getEmbedding(query);

    // Using rpc for vector search since Supabase-JS doesn't support vector ops directly yet
    // This requires a postgres function defined in the migration (need to update migration)
    const { data, error } = await supabase.rpc("match_long_term_memory", {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: limit,
        p_user_id: userId,
    });

    if (error) {
        console.error("query_memory_failed", { error, userId });
        return [];
    }

    return data as Array<{
        content: string;
        metadata: MemoryMetadata;
        similarity: number;
    }>;
}
