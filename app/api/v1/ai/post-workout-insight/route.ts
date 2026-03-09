/**
 * POST /api/v1/ai/post-workout-insight — AI "what this means" after saving a workout.
 * Uses the user's most recent workout (just saved) + recent history.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { consumeToken } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const RATE_LIMIT_CAPACITY = 20;
const RATE_LIMIT_REFILL_PER_SECOND = 20 / 60;

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timeout) };
}

export async function POST() {
  const requestId = makeRequestId();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return jsonError(503, "SERVICE_UNAVAILABLE", "AI service is not configured.");
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const allowAnonymousInDev = process.env.ALLOW_DEV_ANON_AI === "true" && process.env.NODE_ENV === "development";
    if (!user && !allowAnonymousInDev) {
      return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
    }

    const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";

    const limiter = consumeToken(
      `post-workout-insight:${userId}`,
      RATE_LIMIT_CAPACITY,
      RATE_LIMIT_REFILL_PER_SECOND
    );
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(limiter.retryAfterSeconds) } }
      );
    }

    const { data: workouts } = await supabase
      .from("workout_logs")
      .select("date, workout_type, duration_minutes, exercises, notes")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(6);

    const list = (workouts ?? []) as Array<{
      date: string;
      workout_type?: string;
      duration_minutes?: number;
      exercises?: Array<{ name?: string; sets?: number; reps?: string }>;
      notes?: string;
    }>;
    const justCompleted = list[0];
    const recent = list.slice(1);

    if (!justCompleted) {
      return NextResponse.json({ insight: null });
    }

    const systemPrompt = `You are an elite sports scientist and personal trainer. The user just saved a workout. Write 2-3 short sentences: (1) what they did (volume, muscle focus), (2) one recovery or nutrition tip based on exercise science (e.g., Muscle Protein Synthesis windows, glycogen replenishment, CNS recovery), and optionally a nudge for their next session (e.g., "You've accumulated high volume on legs; consider an upper body or active recovery day next"). 

Instructions:
- Translate complex exercise science (e.g., "MPS", "CNS") into simple, actionable, and encouraging language for the user.
- Focus on the specific exercises and volume logged.
- Output ONLY the 2-3 sentences. No greetings or bullets.`;

    const exerciseSummary = (justCompleted.exercises ?? [])
      .map((e) => `${e.name ?? "?"} ${e.sets ?? 0}x${e.reps ?? "?"}`)
      .join("; ");
    const dataBlock = [
      "Just completed: " + justCompleted.date + " " + (justCompleted.workout_type ?? "") + " " + (justCompleted.duration_minutes ?? "") + " min",
      "Exercises: " + (exerciseSummary || "none listed"),
      justCompleted.notes ? "Notes: " + justCompleted.notes : "",
      recent.length ? "Recent sessions (for context): " + recent.map((w) => w.date + " " + (w.workout_type ?? "") + " " + (w.exercises ?? []).map((e) => e.name).filter(Boolean).join(", ")).join("; ") : "",
    ]
      .filter(Boolean)
      .join("\n");

    const payload = {
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Data:\n${dataBlock}\n\nWrite the 2-3 sentence post-workout insight now:` },
      ],
      max_tokens: 256,
    };

    const timeout = withTimeout(12_000);
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: timeout.signal,
    });
    timeout.done();

    if (!res.ok) {
      console.error("post_workout_insight_openrouter_error", { requestId, status: res.status });
      return jsonError(502, "UPSTREAM_ERROR", "AI provider request failed.");
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const insight = (data.choices?.[0]?.message?.content ?? "").trim() || null;

    return NextResponse.json({ insight });
  } catch (error) {
    console.error("post_workout_insight_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "AI service error.");
  }
}
