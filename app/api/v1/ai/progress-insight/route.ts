/**
 * POST /api/v1/ai/progress-insight — AI-generated progress narrative (world-class trainer/nutritionist voice).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { consumeToken } from "@/lib/api/rate-limit";
import { toLocalDateString } from "@/lib/date/local-date";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const RATE_LIMIT_CAPACITY = 20;
const RATE_LIMIT_REFILL_PER_SECOND = 20 / 60;

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timeout) };
}

export async function POST(req: Request) {
  const requestId = makeRequestId();
  const body = await req.json().catch(() => ({}));
  const localDate = body.localDate || toLocalDateString();
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return jsonError(503, "SERVICE_UNAVAILABLE", "AI service is not configured.");
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
    }

    const limiter = consumeToken(
      `progress-insight:${user.id}`,
      RATE_LIMIT_CAPACITY,
      RATE_LIMIT_REFILL_PER_SECOND
    );
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(limiter.retryAfterSeconds) } }
      );
    }

    const today = localDate;
    const [progressRes, workoutsRes, nutritionRes, checkInsRes, profileRes] = await Promise.all([
      supabase
        .from("progress_tracking")
        .select("date, weight, body_fat_percent, measurements, notes")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(14),
      supabase
        .from("workout_logs")
        .select("date, workout_type, duration_minutes, exercises")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(14),
      supabase
        .from("nutrition_logs")
        .select("date, total_calories")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(14),
      supabase
        .from("check_ins")
        .select("date_local, energy_score, sleep_hours, soreness_notes")
        .eq("user_id", user.id)
        .order("date_local", { ascending: false })
        .limit(5),
      supabase.from("user_profile").select("goals").eq("user_id", user.id).maybeSingle(),
    ]);

    const progress = (progressRes.data ?? []) as Array<{ date: string; weight?: number; body_fat_percent?: number; notes?: string }>;
    const workouts = (workoutsRes.data ?? []) as Array<{ date: string; workout_type?: string; duration_minutes?: number }>;
    const nutrition = (nutritionRes.data ?? []) as Array<{ date: string; total_calories?: number }>;
    const checkIns = (checkInsRes.data ?? []) as Array<{ date_local: string; energy_score?: number; sleep_hours?: number; soreness_notes?: string }>;
    const goals = (profileRes.data as { goals?: string[] } | null)?.goals ?? [];

    const weights = progress.filter((p) => p.weight != null).map((p) => ({ date: p.date, weight: p.weight! }));
    const latestWeight = weights[0]?.weight;
    const previousWeight = weights[1]?.weight;
    const trend =
      latestWeight != null && previousWeight != null
        ? latestWeight < previousWeight
          ? "down"
          : latestWeight > previousWeight
            ? "up"
            : "stable"
        : null;

    const systemPrompt = `You are a world-class personal trainer and nutritionist. Given the user's progress and recent activity data below, write exactly 2-3 short sentences that interpret their progress in light of their goals. Be specific to their data (weight trend, training consistency, nutrition). Mention body recomp, cut/bulk context, or recovery when relevant. Use a warm, expert tone. Do not add greetings or bullet points—output only the 2-3 sentence narrative.`;

    const dataBlock = [
      "User goals: " + (goals.length ? goals.join(", ") : "not specified"),
      "Progress (recent): " + progress.map((p) => `${p.date} weight=${p.weight ?? "—"} ${p.body_fat_percent != null ? `bf=${p.body_fat_percent}%` : ""}`).join("; "),
      "Weight trend (latest vs previous): " + (trend ?? "insufficient data"),
      "Recent workouts: " + workouts.map((w) => `${w.date} ${w.workout_type ?? ""} ${w.duration_minutes ?? ""}min`).join("; "),
      "Recent nutrition (calories): " + nutrition.map((n) => `${n.date} ${n.total_calories ?? "?"} cal`).join("; "),
      checkIns.length ? "Recent check-ins: " + checkIns.map((c) => `${c.date_local} energy=${c.energy_score ?? "?"} sleep=${c.sleep_hours ?? "?"}h`).join("; ") : "",
    ]
      .filter(Boolean)
      .join("\n");

    const payload = {
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Data:\n${dataBlock}\n\nWrite the 2-3 sentence progress narrative now:` },
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
      console.error("progress_insight_openrouter_error", { requestId, status: res.status });
      return jsonError(502, "UPSTREAM_ERROR", "AI provider request failed.");
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const insight = (data.choices?.[0]?.message?.content ?? "").trim() || null;

    return NextResponse.json({ insight });
  } catch (error) {
    console.error("progress_insight_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "AI service error.");
  }
}
