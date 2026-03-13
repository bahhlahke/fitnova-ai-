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
      supabase.from("user_profile").select("display_name, goals, activity_level, experience_level").eq("user_id", user.id).maybeSingle(),
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
    const signals = (signalsRes.data ?? []) as any[];
    const prs = (prsRes.data ?? []) as any[];

    const systemPrompt = `You are Koda, an advanced AI Performance Architect. Your task is to write an "Evolutionary Progress Narrative" for the athlete. 
    
This is not a generic summary. It is a cinematic, data-driven story of their evolution over the last 30 days.

Tone:
- Sophisticated, clinical yet inspiring (think Iron Man's JARVIS meets an elite Olympic coach).
- Use terminology like "Kinetic Chain," "Neural Recovery," "Metabolic Flux," and "Adaptation Curve."
- Focus on the *bridge* between their behavior and their results.

Structure:
1. THE CATALYST: Brief mention of their starting point/goals.
2. THE ADAPTATION: Highlight 2-3 specific data-driven victories (e.g., a PR, increased sleep consistency, or metabolic stability).
3. THE HORIZON: A visionary look at what the next 30 days of consistent execution will yield.

Instructions:
- Keep it to 3 short paragraphs.
- Reference specific names of exercises and dates.
- Use the athlete's name (${profile?.display_name || "Athlete"}) occasionally.
- Output ONLY the narrative text.`;

    const dataBlock = [
      "Athlete: " + (profile?.display_name || "Unknown"),
      "Goals: " + (profile?.goals?.length ? profile.goals.join(", ") : "Growth"),
      "Experience: " + (profile?.experience_level || "Intermediate"),
      "Recent Weights: " + progress.filter(p => p.weight).slice(0, 5).map((p) => `${p.date}:${p.weight}kg`).join("; "),
      "Workouts (30d): " + workouts.length + " sessions total. Primary types: " + Array.from(new Set(workouts.map(w => w.workout_type))).slice(0,3).join(", "),
      "Notable PRs: " + prs.map((p) => `${p.exercise_name}: ${Math.round(p.highest_1rm)}kg (${p.date})`).join(", "),
      "Wellness Average (14d): Energy " + (checkIns.reduce((acc, c) => acc + (c.energy_score || 0), 0) / (checkIns.length || 1)).toFixed(1) + "/5, Sleep " + (checkIns.reduce((acc, c) => acc + (c.sleep_hours || 0), 0) / (checkIns.length || 1)).toFixed(1) + "h",
      "Vitals Flux: HRV range " + Math.min(...signals.map(s => s.hrv || 999)) + "-" + Math.max(...signals.map(s => s.hrv || 0)) + "ms",
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
