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
    const sevenDaysAgo = new Date(new Date(`${today}T12:00:00`).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const [progressRes, workoutsRes, nutritionRes, checkInsRes, profileRes, signalsRes, prsRes] = await Promise.all([
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
        .limit(7),
      supabase.from("user_profile").select("goals, activity_level").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("connected_signals")
        .select("signal_date, hrv, resting_hr, recovery_score, sleep_hours, sleep_deep_hours")
        .eq("user_id", user.id)
        .gte("signal_date", sevenDaysAgo)
        .order("signal_date", { ascending: false })
        .limit(7),
      supabase
        .from("exercise_prs")
        .select("exercise_name, highest_1rm")
        .eq("user_id", user.id)
        .limit(5),
    ]);

    const progress = (progressRes.data ?? []) as any[];
    const workouts = (workoutsRes.data ?? []) as any[];
    const nutrition = (nutritionRes.data ?? []) as any[];
    const checkIns = (checkInsRes.data ?? []) as any[];
    const profile = profileRes.data;
    const signals = (signalsRes.data ?? []) as any[];
    const prs = (prsRes.data ?? []) as any[];

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

    const systemPrompt = `You are an elite AI Performance Coach & Sports Scientist with a PhD in Exercise Physiology. Your goal is to synthesize the user's longitudinal biometrics, training volume, and nutrition into a concise, high-level performance insight.
    
Exercise Science Context:
- Analyze correlations between signals (e.g., HRV, Sleep) and actual performance (PRs, Workout Duration).
- Detect metabolic trends: How does calorie intake align with weight progress and training intensity?
- Recovery Debt: If HRV is low and soreness is high, recommend specific recovery modalities.

Instructions:
- Provide exactly 2-3 sentences of world-class synthesis.
- Be authoritative, data-driven, and encouraging.
- Do NOT use generic advice. Reference specific trends (e.g., "Your positive weight trend correlates perfectly with your consistent 8h sleep cycle").
- Output ONLY the 2-3 sentence narrative. No greetings or formatting.`;

    const dataBlock = [
      "Goals: " + (profile?.goals?.length ? profile.goals.join(", ") : "Growth"),
      "Weight: " + weights.map((w) => `${w.date}:${w.weight}kg`).join("; "),
      "Trend: " + (trend ?? "stable"),
      "Workouts (14d): " + workouts.map((w) => `${w.date}:${w.workout_type}`).join("; "),
      "PR Baselines: " + prs.map((p) => `${p.exercise_name}:1RM ${Math.round(p.highest_1rm)}kg`).join(", "),
      "Daily Check-ins: " + checkIns.map((c) => `${c.date_local}: energy ${c.energy_score}/5, sleep ${c.sleep_hours}h`).join("; "),
      "Vitals (Wearable): " + signals.map((s) => `${s.signal_date}: hrv ${s.hrv}ms, recovery ${s.recovery_score}%`).join("; "),
      "Nutrition: " + nutrition.map((n) => `${n.date}:${n.total_calories}cal`).join("; "),
    ]
      .filter(Boolean)
      .join("\n");

    const payload = {
      model: "openai/gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Data:\n${dataBlock}\n\nWrite the performance synthesis now:` },
      ],
      max_tokens: 300,
      temperature: 0.7,
    };

    const timeout = withTimeout(15_000);
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
