const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const DEFAULT_MODEL = "openai/gpt-4o-mini";
const DEFAULT_TIMEOUT_MS = 30_000;
const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

type AIProviderErrorCode =
    | "AI_TIMEOUT"
    | "AI_NETWORK"
    | "AI_HTTP"
    | "AI_INVALID_RESPONSE";

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
    timeoutMs?: number;
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

export class AIProviderError extends Error {
    readonly code: AIProviderErrorCode;
    readonly status?: number;
    readonly providerMessage?: string;
    readonly model?: string;
    readonly retryable: boolean;

    constructor({
        code,
        message,
        status,
        providerMessage,
        model,
        retryable,
    }: {
        code: AIProviderErrorCode;
        message: string;
        status?: number;
        providerMessage?: string;
        model?: string;
        retryable: boolean;
    }) {
        super(message);
        this.name = "AIProviderError";
        this.code = code;
        this.status = status;
        this.providerMessage = providerMessage;
        this.model = model;
        this.retryable = retryable;
    }
}

function withTimeout(ms: number) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ms);
    return {
        signal: controller.signal,
        done: () => clearTimeout(timeout),
    };
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseModelList(raw: string | undefined): string[] {
    if (!raw) return [];
    return raw
        .split(",")
        .map((model) => model.trim())
        .filter((model) => model.length > 0);
}

function extractProviderMessage(rawBody: string): string | undefined {
    const trimmed = rawBody.trim();
    if (!trimmed) return undefined;

    try {
        const parsed = JSON.parse(trimmed) as
            | { error?: { message?: string } | string; message?: string }
            | null;
        if (!parsed || typeof parsed !== "object") {
            return trimmed.slice(0, 240);
        }
        if (typeof parsed.error === "string") {
            return parsed.error.slice(0, 240);
        }
        if (parsed.error && typeof parsed.error === "object" && typeof parsed.error.message === "string") {
            return parsed.error.message.slice(0, 240);
        }
        if (typeof parsed.message === "string") {
            return parsed.message.slice(0, 240);
        }
        return trimmed.slice(0, 240);
    } catch {
        return trimmed.slice(0, 240);
    }
}

function normalizeContent(content: unknown): string {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content
            .map((part) => {
                if (typeof part === "string") return part;
                if (part && typeof part === "object" && "text" in part && typeof (part as { text?: unknown }).text === "string") {
                    return String((part as { text: string }).text);
                }
                return "";
            })
            .filter((part) => part.length > 0)
            .join("\n");
    }
    return "";
}

function shouldFallbackToAnotherModel(error: AIProviderError): boolean {
    if (error.code === "AI_HTTP" && error.status != null) {
        if (error.status === 401 || error.status === 402 || error.status === 403) {
            return false;
        }
    }
    return true;
}

async function callModelForSingleModel({
    model,
    payloadBase,
    apiKey,
    timeoutMs,
}: {
    model: string;
    payloadBase: Record<string, unknown>;
    apiKey: string;
    timeoutMs: number;
}): Promise<CallModelResponse> {
    const payload: Record<string, unknown> = { ...payloadBase, model };
    const timeout = withTimeout(timeoutMs);
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
            const rawBody = await res.text();
            const providerMessage = extractProviderMessage(rawBody);
            const status = res.status;
            const statusSuffix = providerMessage ? ` (${providerMessage})` : "";
            throw new AIProviderError({
                code: "AI_HTTP",
                status,
                providerMessage,
                model,
                retryable: RETRYABLE_STATUS_CODES.has(status),
                message: `AI provider request failed with status ${status}${statusSuffix}`,
            });
        }

        const data = (await res.json()) as {
            choices?: Array<{
                message?: {
                    content?: unknown;
                    tool_calls?: Array<{
                        id: string;
                        type: "function";
                        function: { name: string; arguments: string };
                    }>;
                };
            }>;
        };

        const message = data.choices?.[0]?.message;
        if (!message) {
            throw new AIProviderError({
                code: "AI_INVALID_RESPONSE",
                model,
                retryable: false,
                message: "AI provider returned an empty completion payload",
            });
        }

        return {
            content: normalizeContent(message.content),
            tool_calls: message.tool_calls,
        };
    } catch (error) {
        if (error instanceof AIProviderError) {
            throw error;
        }

        if (error instanceof Error && error.name === "AbortError") {
            throw new AIProviderError({
                code: "AI_TIMEOUT",
                model,
                retryable: true,
                message: "AI provider request timed out",
            });
        }

        const rawMessage = error instanceof Error ? error.message : String(error);
        throw new AIProviderError({
            code: "AI_NETWORK",
            model,
            retryable: true,
            message: `AI provider request failed before completion (${rawMessage})`,
        });
    } finally {
        timeout.done();
    }
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
    const { messages, model, maxTokens = 1024, temperature = 0.7, timeoutMs = DEFAULT_TIMEOUT_MS, tools, tool_choice } = options;
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        throw new Error("AI service is not configured (missing API key).");
    }

    const payloadBase: Record<string, unknown> = {
        messages,
        max_tokens: maxTokens,
        temperature,
    };

    if (tools && tools.length > 0) {
        payloadBase.tools = tools;
        if (tool_choice) {
            payloadBase.tool_choice = tool_choice;
        }
    }

    const configuredModel = model ?? process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
    const candidateModels = Array.from(
        new Set([configuredModel, ...parseModelList(process.env.OPENROUTER_FALLBACK_MODELS), DEFAULT_MODEL])
    );

    let lastError: AIProviderError | null = null;
    for (const candidateModel of candidateModels) {
        for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
                return await callModelForSingleModel({
                    model: candidateModel,
                    payloadBase,
                    apiKey,
                    timeoutMs,
                });
            } catch (error) {
                if (!(error instanceof AIProviderError)) {
                    throw error;
                }

                lastError = error;
                const shouldRetrySameModel = error.retryable && attempt === 0;
                if (shouldRetrySameModel) {
                    await delay(250);
                    continue;
                }

                if (!shouldFallbackToAnotherModel(error)) {
                    throw error;
                }
                break;
            }
        }
    }

    if (lastError) {
        throw lastError;
    }

    throw new Error("AI provider request failed before a response was returned.");
}
