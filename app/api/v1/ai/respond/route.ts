/**
 * POST /api/v1/ai/respond — AI coach chat.
 * Requires OPENROUTER_API_KEY. See docs/API.md for contract.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assembleContext } from "@/lib/ai/assemble-context";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const SYSTEM_PROMPT_VERSION = "v1";

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenRouter API key not configured" },
      { status: 503 }
    );
  }

  let body: { user_id?: string; message: string; contextOverride?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { message, contextOverride } = body;
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json(
      { error: "message is required" },
      { status: 400 }
    );
  }

  let systemPrompt: string = contextOverride ?? "You are an elite fitness coach and nutritionist. Be concise, supportive, and evidence-based. When giving advice, include brief rationale and one alternative option when relevant.";

  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
    if (userId) {
      const { systemPrompt: assembled } = await assembleContext(supabase, userId);
      if (!contextOverride) systemPrompt = assembled;
    }
  } catch {
    // No Supabase or no user — use default prompt
  }

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
    { role: "user", content: message.trim() },
  ];

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": request.headers.get("origin") ?? undefined,
      } as HeadersInit,
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "OpenRouter request failed", details: text },
        { status: res.status }
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content =
      data.choices?.[0]?.message?.content ?? "I couldn't generate a response.";

    if (userId) {
      try {
        const supabase = await createClient();
        const { data: existing } = await supabase
          .from("ai_conversations")
          .select("convo_id, user_message_history")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const history = (existing?.user_message_history as Array<{ role: string; content: string }>) ?? [];
        const newHistory = [
          ...history.slice(-50),
          { role: "user", content: message.trim() },
          { role: "assistant", content },
        ];

        const summary = content.slice(0, 500);

        if (existing?.convo_id) {
          await supabase
            .from("ai_conversations")
            .update({
              user_message_history: newHistory,
              ai_reply_summary: summary,
              updated_at: new Date().toISOString(),
            })
            .eq("convo_id", existing.convo_id);
        } else {
          await supabase.from("ai_conversations").insert({
            user_id: userId,
            system_prompt_version: SYSTEM_PROMPT_VERSION,
            user_message_history: newHistory,
            ai_reply_summary: summary,
          });
        }
      } catch (e) {
        console.error("Failed to persist conversation:", e);
      }
    }

    return NextResponse.json({ reply: content });
  } catch (err) {
    console.error("AI respond error:", err);
    return NextResponse.json(
      { error: "AI service error" },
      { status: 500 }
    );
  }
}
