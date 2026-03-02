/**
 * POST /api/v1/ai/nutrition-insight — Daily AI nutritionist insight (today's meals vs plan + one tip).
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
      `nutrition-insight:${user.id}`,
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
    const [nutritionRes, planRes, profileRes] = await Promise.all([
      supabase
        .from("nutrition_logs")
        .select("meals, total_calories")
        .eq("user_id", user.id)
        .eq("date", today)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("daily_plans")
        .select("plan_json")
        .eq("user_id", user.id)
        .eq("date_local", today)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("user_profile").select("goals, dietary_preferences").eq("user_id", user.id).maybeSingle(),
    ]);

    const nutritionRow = nutritionRes.data as { meals?: Array<{ time?: string; description?: string; calories?: number }>; total_calories?: number } | null;
    const plan = planRes.data?.plan_json as { nutrition_plan?: { calorie_target?: number; macros?: { protein_g?: number } } } | undefined;
    const profile = (profileRes.data ?? {}) as { goals?: string[]; dietary_preferences?: Record<string, unknown> };

    const meals = nutritionRow?.meals ?? [];
    const totalCalories = nutritionRow?.total_calories ?? meals.reduce((s, m) => s + (m.calories ?? 0), 0);
    const estimatedProtein = meals.reduce((s, m) => s + ((m as { macros?: { protein?: number } }).macros?.protein ?? 0), 0) || Math.round(meals.length * 28);
    const calorieTarget = plan?.nutrition_plan?.calorie_target;
    const proteinTarget = plan?.nutrition_plan?.macros?.protein_g;

    const systemPrompt = `You are a world-class nutritionist. Given the user's today's meals and (if available) their daily plan targets, write 1-2 short sentences: one unique take on their intake (gaps, timing, or protein) and one concrete tip or next-meal idea. Be specific to their data. Use a warm, expert tone. Output only the 1-2 sentence insight, no greeting or bullets.`;

    const dataBlock = [
      "Today's meals: " + (meals.length ? meals.map((m) => `${m.time ?? ""} ${m.description ?? ""} ${m.calories ?? "?"} cal`).join("; ") : "none logged yet"),
      "Total calories so far: " + totalCalories,
      "Estimated protein so far (g): " + estimatedProtein,
      calorieTarget != null ? "Plan calorie target: " + calorieTarget : "",
      proteinTarget != null ? "Plan protein target (g): " + proteinTarget : "",
      profile.goals?.length ? "User goals: " + profile.goals.join(", ") : "",
    ]
      .filter(Boolean)
      .join("\n");

    const payload = {
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Data:\n${dataBlock}\n\nWrite the 1-2 sentence nutrition insight now:` },
      ],
      max_tokens: 200,
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
      console.error("nutrition_insight_openrouter_error", { requestId, status: res.status });
      return jsonError(502, "UPSTREAM_ERROR", "AI provider request failed.");
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const insight = (data.choices?.[0]?.message?.content ?? "").trim() || null;

    return NextResponse.json({ insight });
  } catch (error) {
    console.error("nutrition_insight_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "AI service error.");
  }
}
