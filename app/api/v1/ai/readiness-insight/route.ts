/**
 * POST /api/v1/ai/readiness-insight — AI "Today's readiness" 1-2 sentences (recovery / train today).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { consumeToken } from "@/lib/api/rate-limit";
import { toLocalDateString } from "@/lib/date/local-date";

export const dynamic = "force-dynamic";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const RATE_LIMIT_CAPACITY = 30;
const RATE_LIMIT_REFILL_PER_SECOND = 30 / 60;

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timeout) };
}

export async function POST(req: Request) {
  const requestId = makeRequestId();
  const body: any = await req.json().catch(() => ({}));
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
    const allowAnonymousInDev = process.env.ALLOW_DEV_ANON_AI === "true" && process.env.NODE_ENV === "development";
    if (!user && !allowAnonymousInDev) {
      return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
    }

    const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";

    const limiter = consumeToken(
      `readiness-insight:${userId}`,
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

    const [workoutsRes, checkInsRes, planRes, signalsRes] = await Promise.all([
      supabase
        .from("workout_logs")
        .select("date, workout_type, duration_minutes")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(7),
      supabase
        .from("check_ins")
        .select("date_local, energy_score, sleep_hours, soreness_notes")
        .eq("user_id", userId)
        .eq("date_local", today)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("daily_plans")
        .select("plan_json")
        .eq("user_id", userId)
        .eq("date_local", today)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("connected_signals")
        .select("signal_date, provider, hrv, resting_hr, spo2_avg, sleep_hours, sleep_deep_hours, recovery_score")
        .eq("user_id", userId)
        .gte("signal_date", sevenDaysAgo)
        .order("signal_date", { ascending: false })
        .limit(7),
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

    const systemPrompt = `You are an elite sports scientist and personal trainer. Your goal is to analyze the user's recent training data and provide a 1-2 sentence readiness insight.

Exercise Science Context:
- We track Readiness using the Banister Fitness-Fatigue model (Acute:Chronic Workload Ratio). 
- A score of 80-100 means they are "Primed" (Fitness > Fatigue).
- A score of 50-79 means they are "Recovering" or "Detraining".
- A score <40 means they are "Overtraining" or in the "Danger Zone".

Instructions for Output:
- Provide a simple, actionable insight based on their readiness score, sleep, and soreness.
- Do NOT use complex jargon like "ACWR", "Chronic Workload", or "Banister model" in the output. Translate the science into simple advice (e.g., "Your muscles are fully recovered and primed for a heavy session today" or "Your recent training load is high; consider an active recovery day").
- Output ONLY the 1-2 sentence insight. No greetings, no bullets.`;

    // Calculate a rough "Overall Readiness" average if the client passed it
    const readinessMap = body.readiness as Record<string, number> | undefined;
    let averageReadiness: string | number = "Unknown";
    if (readinessMap) {
      const keys = Object.keys(readinessMap);
      if (keys.length > 0) {
        const sum = keys.reduce((acc, key) => acc + (readinessMap[key] || 0), 0);
        averageReadiness = Math.round(sum / keys.length);
      }
    }

    const signals = (signalsRes?.data ?? []) as Array<{
      signal_date: string;
      provider?: string | null;
      hrv?: number | null;
      resting_hr?: number | null;
      spo2_avg?: number | null;
      sleep_hours?: number | null;
      sleep_deep_hours?: number | null;
      recovery_score?: number | null;
    }>;
    const latestSignal = signals[0] ?? null;

    const dataBlock = [
      "Today: " + today,
      "Last workout: " + (lastWorkoutDate ?? "no data") + (daysSinceLast != null ? " (" + daysSinceLast + " days ago)" : ""),
      "Consecutive training days: " + consecutiveDays,
      "Overall ACWR Readiness Score (0-100): " + averageReadiness,
      todayCheckIn
        ? "Today's check-in: energy " + (todayCheckIn.energy_score ?? "?") + "/5, sleep " + (todayCheckIn.sleep_hours ?? "?") + "h" + (todayCheckIn.soreness_notes ? ", soreness: " + todayCheckIn.soreness_notes : "")
        : "No check-in today",
      "Has plan for today: " + hasPlanToday,
      latestSignal ? [
        "Wearable data (" + (latestSignal.provider ?? "device") + " - " + latestSignal.signal_date + "):",
        latestSignal.hrv != null ? "  HRV: " + Math.round(latestSignal.hrv) + " ms" : null,
        latestSignal.resting_hr != null ? "  Resting HR: " + Math.round(latestSignal.resting_hr) + " bpm" : null,
        latestSignal.sleep_hours != null ? "  Total sleep: " + latestSignal.sleep_hours.toFixed(1) + " hrs" : null,
        latestSignal.sleep_deep_hours != null ? "  Deep sleep: " + latestSignal.sleep_deep_hours.toFixed(1) + " hrs" : null,
        latestSignal.spo2_avg != null ? "  SpO2: " + Math.round(latestSignal.spo2_avg) + "%" : null,
        latestSignal.recovery_score != null ? "  Recovery score: " + Math.round(latestSignal.recovery_score) + "%" : null,
      ].filter(Boolean).join("\n") : "No wearable data available",
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
