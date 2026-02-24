/**
 * POST /api/v1/ai/respond — AI coach chat.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assembleContext } from "@/lib/ai/assemble-context";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { consumeToken } from "@/lib/api/rate-limit";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const SYSTEM_PROMPT_VERSION = "v2-balanced-safety";
const MAX_MESSAGE_CHARS = 2000;
const RATE_LIMIT_CAPACITY = 12;
const RATE_LIMIT_REFILL_PER_SECOND = 12 / 60;

const SAFETY_POLICY = `Safety policy (balanced):
- Provide educational fitness and nutrition coaching only.
- Do not diagnose, treat, or claim to replace licensed medical professionals.
- For severe pain, chest pain, dizziness, or concerning symptoms, tell the user to stop and seek medical care.
- Respect injuries/limitations from profile data and provide safer alternatives.
- Prefer sustainable, evidence-informed advice over extreme protocols.`;

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    done: () => clearTimeout(timeout),
  };
}

async function callOpenRouter(payload: object, apiKey: string, originHeader: string | null) {
  const timeout = withTimeout(15_000);
  try {
    return await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(originHeader ? { "HTTP-Referer": originHeader } : {}),
      },
      body: JSON.stringify(payload),
      signal: timeout.signal,
    });
  } finally {
    timeout.done();
  }
}

export async function POST(request: Request) {
  const requestId = makeRequestId();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return jsonError(
      503,
      "SERVICE_UNAVAILABLE",
      "AI service is not configured."
    );
  }

  let body: { message?: string };
  try {
    body = (await request.json()) as { message?: string };
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid JSON body.");
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return jsonError(400, "VALIDATION_ERROR", "message is required.");
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      `message must be <= ${MAX_MESSAGE_CHARS} characters.`
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const allowAnonymousInDev = process.env.ALLOW_DEV_ANON_AI === "true";
    if (!user && !allowAnonymousInDev) {
      return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
    }

    const userId = user?.id ?? "anonymous";
    const limiter = consumeToken(
      `ai:${userId}`,
      RATE_LIMIT_CAPACITY,
      RATE_LIMIT_REFILL_PER_SECOND
    );
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMITED" },
        {
          status: 429,
          headers: { "Retry-After": String(limiter.retryAfterSeconds) },
        }
      );
    }

    let systemPrompt =
      "You are an elite fitness coach and nutritionist. Be concise, supportive, and evidence-based. Include one alternative option when relevant.";

    if (user?.id) {
      try {
        const { systemPrompt: assembled } = await assembleContext(supabase, user.id);
        systemPrompt = `${assembled}\n\n${SAFETY_POLICY}`;
      } catch {
        systemPrompt = `${systemPrompt}\n\n${SAFETY_POLICY}`;
      }
    } else {
      systemPrompt = `${systemPrompt}\n\n${SAFETY_POLICY}`;
    }

    const payload = {
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      max_tokens: 1024,
    };

    let res = await callOpenRouter(payload, apiKey, request.headers.get("origin"));
    if (!res.ok && res.status >= 500) {
      res = await callOpenRouter(payload, apiKey, request.headers.get("origin"));
    }

    if (!res.ok) {
      console.error("ai_openrouter_error", {
        requestId,
        status: res.status,
      });
      return jsonError(502, "UPSTREAM_ERROR", "AI provider request failed.");
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content =
      data.choices?.[0]?.message?.content ?? "I couldn't generate a response.";

    if (user?.id) {
      try {
        const { data: existing } = await supabase
          .from("ai_conversations")
          .select("convo_id, user_message_history")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const history =
          (existing?.user_message_history as Array<{ role: string; content: string }>) ?? [];
        const newHistory = [
          ...history.slice(-50),
          { role: "user", content: message },
          { role: "assistant", content },
        ];

        const summary = content.slice(0, 500);

        if (existing?.convo_id) {
          await supabase
            .from("ai_conversations")
            .update({
              user_message_history: newHistory,
              ai_reply_summary: summary,
              system_prompt_version: SYSTEM_PROMPT_VERSION,
            })
            .eq("convo_id", existing.convo_id);
        } else {
          await supabase.from("ai_conversations").insert({
            user_id: user.id,
            system_prompt_version: SYSTEM_PROMPT_VERSION,
            user_message_history: newHistory,
            ai_reply_summary: summary,
          });
        }
      } catch (persistErr) {
        console.error("ai_persist_error", {
          requestId,
          userId: user.id,
          error:
            persistErr instanceof Error ? persistErr.message : "unknown persist error",
        });
      }
    }

    return NextResponse.json({ reply: content });
  } catch (error) {
    console.error("ai_respond_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "AI service error.");
  }
}
