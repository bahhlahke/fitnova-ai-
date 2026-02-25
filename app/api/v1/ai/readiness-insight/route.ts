/**
 * POST /api/v1/ai/readiness-insight — AI "Today's readiness" 1-2 sentences (recovery / train today).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { consumeToken } from "@/lib/api/rate-limit";
import { toLocalDateString } from "@/lib/date/local-date";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const RATE_LIMIT_CAPACITY = 30;
const RATE_LIMIT_REFILL_PER_SECOND = 30 / 60;

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
    if (!user) {
      return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
    }

    const limiter = consumeToken(
      `readiness-insight:${user.id}`,
      RATE_LIMIT_CAPACITY,
      RATE_LIMIT_REFILL_PER_SECOND
    );
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(limiter.retryAfterSeconds) } }
      );
    }

    const today = toLocalDateString();
    const [workoutsRes, checkInsRes, planRes] = await Promise.all([
      supabase
        .from("workout_logs")
        .select("date, workout_type, duration_minutes")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(7),
      supabase
        .from("check_ins")
        .select("date_local, energy_score, sleep_hours, soreness_notes")
        .eq("user_id", user.id)
        .eq("date_local", today)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("daily_plans")
        .select("plan_json")
        .eq("user_id", user.id)
        .eq("date_local", today)
        .limit(1)
        .maybeSingle(),
    ]);

    const workouts = (workoutsRes.data ?? []) as Array<{ date: string; workout_type?: string; duration_minutes?: number }>;
    const todayCheckIn = checkInsRes.data as { energy_score?: number; sleep_hours?: number; soreness_notes?: string } | null;
    const hasPlanToday = !!(planRes.data as { plan_json?: unknown } | null)?.plan_json;

    const lastWorkoutDate = workouts[0]?.date ?? null;
    const daysSinceLast =
      lastWorkoutDate != null
        ? Math.floor(
            (new Date(today).setHours(0, 0, 0, 0) - new Date(lastWorkoutDate).setHours(0, 0, 0, 0)) /
              (24 * 60 * 60 * 1000)
          )
        : null;
    const consecutiveDays = (() => {
      let count = 0;
      let prev = "";
      for (const w of workouts) {
        if (prev && w.date !== prev) {
          const diff = Math.floor(
            (new Date(prev).setHours(0, 0, 0, 0) - new Date(w.date).setHours(0, 0, 0, 0)) /
              (24 * 60 * 60 * 1000)
          );
          if (diff !== 1) break;
        }
        prev = w.date;
        count += 1;
      }
      return count;
    })();

    const systemPrompt = `You are a world-class personal trainer. Given the user's recent workouts and today's check-in (if any), write 1-2 short sentences: either "Good day for a solid session" style or "Consider light movement or rest" style. Be specific to their data (days since last workout, consecutive training days, sleep, soreness). Output only the 1-2 sentence insight, no greeting or bullets.`;

    const dataBlock = [
      "Today: " + today,
      "Last workout: " + (lastWorkoutDate ?? "no data") + (daysSinceLast != null ? " (" + daysSinceLast + " days ago)" : ""),
      "Consecutive training days (recent): " + consecutiveDays,
      todayCheckIn
        ? "Today's check-in: energy " + (todayCheckIn.energy_score ?? "?") + "/5, sleep " + (todayCheckIn.sleep_hours ?? "?") + "h" + (todayCheckIn.soreness_notes ? ", soreness: " + todayCheckIn.soreness_notes : "")
        : "No check-in today",
      "Has plan for today: " + hasPlanToday,
    ].join("\n");

    const payload = {
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Data:\n${dataBlock}\n\nWrite the 1-2 sentence readiness insight now:` },
      ],
      max_tokens: 150,
    };

    const timeout = withTimeout(10_000);
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
      console.error("readiness_insight_openrouter_error", { requestId, status: res.status });
      return jsonError(502, "UPSTREAM_ERROR", "AI provider request failed.");
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const insight = (data.choices?.[0]?.message?.content ?? "").trim() || null;

    return NextResponse.json({ insight });
  } catch (error) {
    console.error("readiness_insight_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "AI service error.");
  }
}
