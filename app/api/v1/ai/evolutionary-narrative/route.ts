/**
 * POST /api/v1/ai/evolutionary-narrative — AI-generated long-form progress story.
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
      `evolutionary-narrative:${user.id}`,
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
    const thirtyDaysAgo = new Date(new Date(`${today}T12:00:00`).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const [progressRes, workoutsRes, nutritionRes, checkInsRes, profileRes, signalsRes, prsRes] = await Promise.all([
      supabase
        .from("progress_tracking")
        .select("date, weight, body_fat_percent, measurements, notes")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(30),
      supabase
        .from("workout_logs")
        .select("date, workout_type, duration_minutes, exercises")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(30),
      supabase
        .from("nutrition_logs")
        .select("date, total_calories, protein_g")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(30),
      supabase
        .from("check_ins")
        .select("date_local, energy_score, sleep_hours, soreness_notes")
        .eq("user_id", user.id)
        .order("date_local", { ascending: false })
        .limit(14),
      supabase.from("user_profile").select("name, goals, activity_level, experience_level").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("connected_signals")
        .select("signal_date, hrv, resting_hr, recovery_score, sleep_hours")
        .eq("user_id", user.id)
        .gte("signal_date", thirtyDaysAgo)
        .order("signal_date", { ascending: false })
        .limit(30),
      supabase
        .from("exercise_prs")
        .select("exercise_name, highest_1rm, date")
        .eq("user_id", user.id)
        .order("highest_1rm", { ascending: false })
        .limit(10),
    ]);

    const progress = (progressRes.data ?? []) as any[];
    const workouts = (workoutsRes.data ?? []) as any[];
    const nutrition = (nutritionRes.data ?? []) as any[];
    const checkIns = (checkInsRes.data ?? []) as any[];
    const profile = profileRes.data;
    const profileName = profile?.name || "Athlete";
    const signals = (signalsRes.data ?? []) as any[];
    const prs = (prsRes.data ?? []) as any[];

    const systemPrompt = `You are Koda, an advanced AI Performance Architect. Your task is to write an "Evolutionary Progress Narrative" for the athlete. 
    
This is a clinical, high-fidelity audit of their physiological and performance data over the last 30 days.

Objective:
- Determine if the athlete is successfully adapting or if they are in a state of stagnant homeostasis.
- Use exercise and nutrition science principles (e.g., SAID principle, glycemic pacing, progressive overload, recovery-debt management).
- Provide high-leverage tactical "Prescriptions" for the next training block.

Tone:
- Clinical, authoritative, yet motivating.
- Use terminology like "Adaptation Rate," "Hypertrophic Volume," "Neural Efficiency," and "Metabolic Compliance."

Structure:
1. METABOLIC & NEURAL STATE: Brief synthesis of recovery (HRV/Sleep) and nutrition compliance.
2. ADAPTIVE SIGNAL: Direct analysis of strength/PR trends and weight velocity.
3. PRESCRIPTION: 1-2 specific tactical changes (e.g., "increase eccentric load on hinges," "front-load 50g carbs pre-session").

Instructions:
- CRITICAL: Keep total length under 160 words.
- Be precise: mention specific exercise names, loads, and dates.
- Use the athlete's name (${profileName}) sparingly.
- Output ONLY the narrative text.`;

    const dataBlock = [
      "Athlete: " + profileName,
      "Goals: " + (profile?.goals?.length ? profile.goals.join(", ") : "General Performance"),
      "Experience: " + (profile?.experience_level || "Intermediate"),
      "Weight Velocity (5-entry avg): " + (progress.filter(p => p.weight).slice(0, 5).map((p) => `${p.date}:${p.weight}kg`).join("; ")),
      "Strength Trajectory (Top 10 PRs): " + prs.map((p) => `${p.exercise_name}: ${Math.round(p.highest_1rm)}kg (${p.date})`).join(", "),
      "Training Density (30d): " + workouts.length + " sessions. Mix: " + Array.from(new Set(workouts.map(w => w.workout_type))).slice(0,3).join(", "),
      "Nutrition Compliance (avg protein/cal): " + (nutrition.reduce((acc, n) => acc + (n.total_calories || 0), 0) / (nutrition.length || 1)).toFixed(0) + "kcal, " + (nutrition.reduce((acc, n) => acc + (n.protein_g || 0), 0) / (nutrition.length || 1)).toFixed(0) + "g protein",
      "Recovery Debt (14d signals): HRV range " + Math.min(...signals.map(s => s.hrv || 999)) + "-" + Math.max(...signals.map(s => s.hrv || 0)) + "ms. Sleep avg: " + (signals.reduce((acc, s) => acc + (s.sleep_hours || 0), 0) / (signals.length || 1)).toFixed(1) + "h.",
    ]
      .filter(Boolean)
      .join("\n");

    const payload = {
      model: "openai/gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `30-Day Performance Audit Data:\n${dataBlock}\n\nGenerate the Evolutionary Narrative now:` },
      ],
      max_tokens: 600,
      temperature: 0.7,
    };

    const timeout = withTimeout(25_000);
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
      return jsonError(502, "UPSTREAM_ERROR", "AI provider request failed.");
    }

    const resData = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const narrative = (resData.choices?.[0]?.message?.content ?? "").trim() || null;

    return NextResponse.json({ narrative });
  } catch (error) {
    console.error("evolutionary_narrative_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "AI service error.");
  }
}
