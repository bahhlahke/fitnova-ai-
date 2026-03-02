/**
 * POST /api/v1/ai/weekly-insight — AI 2-3 sentence weekly recap + one recommendation.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { consumeToken } from "@/lib/api/rate-limit";
import { toLocalDateString } from "@/lib/date/local-date";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const RATE_LIMIT_CAPACITY = 10;
const RATE_LIMIT_REFILL_PER_SECOND = 10 / 3600;

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timeout) };
}

function getWeekStart(d: Date): string {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return toLocalDateString(monday);
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
      `weekly-insight:${user.id}`,
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
    const weekStart = getWeekStart(new Date(today + "T12:00:00"));
    const [workoutsRes, nutritionRes, progressRes, profileRes] = await Promise.all([
      supabase
        .from("workout_logs")
        .select("date, workout_type, duration_minutes")
        .eq("user_id", user.id)
        .gte("date", weekStart)
        .lte("date", today)
        .order("date", { ascending: true }),
      supabase
        .from("nutrition_logs")
        .select("date, total_calories")
        .eq("user_id", user.id)
        .gte("date", weekStart)
        .lte("date", today),
      supabase
        .from("progress_tracking")
        .select("date, weight")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(5),
      supabase.from("user_profile").select("goals").eq("user_id", user.id).maybeSingle(),
    ]);

    const workouts = (workoutsRes.data ?? []) as Array<{ date: string; workout_type?: string; duration_minutes?: number }>;
    const nutrition = (nutritionRes.data ?? []) as Array<{ date: string; total_calories?: number }>;
    const progress = (progressRes.data ?? []) as Array<{ date: string; weight?: number }>;
    const goals = (profileRes.data as { goals?: string[] } | null)?.goals ?? [];

    const workoutCount = workouts.length;
    const avgCalories =
      nutrition.length > 0
        ? Math.round(
          nutrition.reduce((s, n) => s + (n.total_calories ?? 0), 0) / nutrition.length
        )
        : null;
    const weightTrend =
      progress.length >= 2 && progress[0].weight != null && progress[1].weight != null
        ? (progress[0].weight > progress[1].weight ? "up" : progress[0].weight < progress[1].weight ? "down" : "stable")
        : null;

    const systemPrompt = `You are a world-class personal trainer and nutritionist. Given the user's week summary below, write exactly 2-3 short sentences: a recap of their consistency (workouts, nutrition) and one prioritized recommendation for the coming week. Be specific to their data. Warm, expert tone. Output only the 2-3 sentence recap, no greeting or bullets.`;

    const dataBlock = [
      "Week: " + weekStart + " to " + today,
      "User goals: " + (goals.length ? goals.join(", ") : "not specified"),
      "Workouts this week: " + workoutCount,
      "Workout days: " + Array.from(new Set(workouts.map((w) => w.date))).join(", ") || "none",
      avgCalories != null ? "Average calories (logged days): " + avgCalories : "No nutrition logged this week.",
      weightTrend ? "Weight trend (recent): " + weightTrend : "",
    ]
      .filter(Boolean)
      .join("\n");

    const payload = {
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Data:\n${dataBlock}\n\nWrite the 2-3 sentence weekly recap now:` },
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
      console.error("weekly_insight_openrouter_error", { requestId, status: res.status });
      return jsonError(502, "UPSTREAM_ERROR", "AI provider request failed.");
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const insight = (data.choices?.[0]?.message?.content ?? "").trim() || null;

    return NextResponse.json({
      insight,
      workoutCount,
      avgCalories,
      weightTrend,
    });
  } catch (error) {
    console.error("weekly_insight_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "AI service error.");
  }
}
