const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export type Message = {
    role: "system" | "user" | "assistant";
    content: string;
};

export type CallModelOptions = {
    messages: Message[];
    model?: string;
    maxTokens?: number;
    temperature?: number;
};

function withTimeout(ms: number) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ms);
    return {
        signal: controller.signal,
        done: () => clearTimeout(timeout),
    };
}

export async function callModel(options: CallModelOptions): Promise<string> {
    const { messages, model = "openai/gpt-4o-mini", maxTokens = 1024, temperature = 0.7 } = options;
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        throw new Error("AI service is not configured (missing API key).");
    }

    const payload = {
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
    };

    const timeout = withTimeout(15_000);
    try {
        const res = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
            signal: timeout.signal,
        });

        if (!res.ok) {
            throw new Error(`AI provider request failed with status ${res.status}`);
        }

        const data = (await res.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
        };

        return data.choices?.[0]?.message?.content ?? "I couldn't generate a response.";
    } finally {
        timeout.done();
    }
}
