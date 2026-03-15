/**
 * POST /api/v1/ai/unique-insights — AI-generated high-signal performance "nuggets".
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { consumeToken } from "@/lib/api/rate-limit";
import { toLocalDateString } from "@/lib/date/local-date";

export const dynamic = "force-dynamic";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const RATE_LIMIT_CAPACITY = 10;
const RATE_LIMIT_REFILL_PER_SECOND = 10 / 60;

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timeout) };
}

export async function POST(req: Request) {
  const requestId = makeRequestId();
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return jsonError(503, "SERVICE_UNAVAILABLE", "AI service is not configured.");
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
    }

    const limiter = consumeToken(`unique-insights:${user.id}`, RATE_LIMIT_CAPACITY, RATE_LIMIT_REFILL_PER_SECOND);
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(limiter.retryAfterSeconds) } }
      );
    }

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Fetch deep data for pattern recognition
    const [workoutsRes, signalsRes, checkInsRes, progressRes] = await Promise.all([
      supabase.from("workout_logs").select("date, workout_type, exercises").eq("user_id", user.id).gte("date", ninetyDaysAgo),
      supabase.from("connected_signals").select("signal_date, hrv, resting_hr, recovery_score, sleep_hours, strain_score").eq("user_id", user.id).gte("signal_date", ninetyDaysAgo),
      supabase.from("check_ins").select("date_local, energy_score, sleep_hours, soreness_notes").eq("user_id", user.id).gte("date_local", ninetyDaysAgo),
      supabase.from("progress_tracking").select("date, weight, body_fat_percent").eq("user_id", user.id).gte("date", ninetyDaysAgo),
    ]);

    const systemPrompt = `You are Koda's "Insight Engine". Your job is to find 3-4 "Unique Performance Insights" from the user's last 90 days of data.
    
Look for correlations and patterns that aren't obvious:
1. "Work-Rest Harmony": How sleep affects the next day's workout volume.
2. "Recovery Lag": How long it takes for HRV to normalize after different workout types.
3. "Consistency Anchors": Which days or types of workouts drive the most compliance.
4. "Stall Signals": Subtle signs that weight or strength is plateauing.

Output Format:
Return a JSON array of objects:
[
  { "title": "Insight Title", "description": "1-2 sentence explanation of the pattern", "type": "recovery|performance|consistency|composition" }
]

Output ONLY valid JSON. Keep it clinical, elite, and ultra-short.`;

    const dataSnapshot = {
      workoutCount: workoutsRes.data?.length || 0,
      vitalsAvailable: signalsRes.data?.length || 0,
      checkInCount: checkInsRes.data?.length || 0,
      progressCount: progressRes.data?.length || 0,
      recentVitals: signalsRes.data?.slice(0, 10),
      recentWorkouts: workoutsRes.data?.slice(0, 10),
      recentProgress: progressRes.data?.slice(0, 10),
    };

    const payload = {
      model: "openai/gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `90-Day Raw Data Snapshot:\n${JSON.stringify(dataSnapshot)}\n\nGenerate unique insights now:` },
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
    };

    const timeout = withTimeout(25_000);
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
      signal: timeout.signal,
    });
    timeout.done();

    if (!res.ok) return jsonError(502, "UPSTREAM_ERROR", "AI provider request failed.");

    const resData = await res.json();
    let insights = [];
    try {
        const content = JSON.parse(resData.choices?.[0]?.message?.content || "{}");
        insights = content.insights || content || [];
    } catch (e) {
        console.error("Failed to parse AI insights", e);
    }

    return NextResponse.json({ insights });
  } catch (error) {
    console.error("unique_insights_unhandled", error);
    return jsonError(500, "INTERNAL_ERROR", "AI service error.");
  }
}
