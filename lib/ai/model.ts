const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export type MessageContent = string | Array<{
    type: "text" | "image_url";
    text?: string;
    image_url?: { url: string };
}> | null;

export type Message = {
    role: "system" | "user" | "assistant" | "tool";
    content?: MessageContent;
    tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
    }>;
    tool_call_id?: string;
    name?: string;
};

export type CallModelOptions = {
    messages: Message[];
    model?: string;
    maxTokens?: number;
    temperature?: number;
    tools?: Array<{
        type: "function";
        function: {
            name: string;
            description: string;
            parameters: Record<string, unknown>;
        };
    }>;
    tool_choice?: "auto" | "none" | { type: "function"; function: { name: string } };
};

function withTimeout(ms: number) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ms);
    return {
        signal: controller.signal,
        done: () => clearTimeout(timeout),
    };
}

export type CallModelResponse = {
    content: string;
    tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
    }>;
};

export async function callModel(options: CallModelOptions): Promise<CallModelResponse> {
    const { messages, model = "openai/gpt-4o-mini", maxTokens = 1024, temperature = 0.7, tools, tool_choice } = options;
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        throw new Error("AI service is not configured (missing API key).");
    }

    const payload: Record<string, any> = {
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
    };

    if (tools && tools.length > 0) {
        payload.tools = tools;
        if (tool_choice) {
            payload.tool_choice = tool_choice;
        }
    }

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
            choices?: Array<{
                message?: {
                    content?: string | null;
                    tool_calls?: Array<{
                        id: string;
                        type: "function";
                        function: { name: string; arguments: string };
                    }>;
                }
            }>;
        };

        const message = data.choices?.[0]?.message;

        return {
            content: message?.content ?? "",
            tool_calls: message?.tool_calls,
        };
    } finally {
        timeout.done();
    }
}
