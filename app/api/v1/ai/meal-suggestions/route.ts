/**
 * POST /api/v1/ai/meal-suggestions — 1-3 concrete meal/snack suggestions fitting remaining calories/macros.
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

export async function POST(request: Request) {
  const requestId = makeRequestId();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return jsonError(503, "SERVICE_UNAVAILABLE", "AI service is not configured.");
  }

  let body: { context?: string } = {};
  try {
    body = (await request.json()) as { context?: string };
  } catch {
    body = {};
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
      `meal-suggestions:${user.id}`,
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
    const context = typeof body.context === "string" ? body.context.trim() : "";
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
      supabase.from("user_profile").select("dietary_preferences").eq("user_id", user.id).maybeSingle(),
    ]);

    const nutritionRow = nutritionRes.data as { meals?: Array<{ calories?: number; macros?: { protein?: number } }>; total_calories?: number } | null;
    const plan = planRes.data?.plan_json as { nutrition_plan?: { calorie_target?: number; macros?: { protein_g?: number } } } | undefined;
    const dietaryPrefs = (profileRes.data as { dietary_preferences?: Record<string, unknown> } | null)?.dietary_preferences ?? {};

    const meals = nutritionRow?.meals ?? [];
    const totalCalories = nutritionRow?.total_calories ?? meals.reduce((s, m) => s + (m.calories ?? 0), 0);
    const totalProtein = meals.reduce((s, m) => s + ((m as { macros?: { protein?: number } }).macros?.protein ?? 0), 0) || Math.round(meals.length * 28);
    const calorieTarget = plan?.nutrition_plan?.calorie_target ?? 2000;
    const proteinTarget = plan?.nutrition_plan?.macros?.protein_g ?? 120;
    const remainingCal = Math.max(0, calorieTarget - totalCalories);
    const remainingProtein = Math.max(0, proteinTarget - totalProtein);

    const systemPrompt = `You are a world-class nutritionist. Given the user's remaining calories and protein for today, and their dietary preferences, output exactly 3 meal or snack suggestions. For each suggestion provide: a short name (e.g. "Greek yogurt + banana + almonds"), estimated calories, estimated protein in grams, and one short line (e.g. "Quick, no cook"). Respect dietary preferences (vegetarian, etc.). Output valid JSON only, no markdown, in this exact shape: { "suggestions": [ { "name": "...", "calories": number, "protein_g": number, "note": "..." }, ... ] }.`;

    const dataBlock = [
      "Remaining calories today: " + remainingCal,
      "Remaining protein (g): " + remainingProtein,
      "Dietary preferences: " + JSON.stringify(dietaryPrefs),
      context ? "Context (e.g. meal type): " + context : "",
    ]
      .filter(Boolean)
      .join("\n");

    const payload = {
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Data:\n${dataBlock}\n\nOutput JSON with 3 suggestions:` },
      ],
      max_tokens: 400,
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
      console.error("meal_suggestions_openrouter_error", { requestId, status: res.status });
      return jsonError(502, "UPSTREAM_ERROR", "AI provider request failed.");
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = (data.choices?.[0]?.message?.content ?? "").trim();
    let suggestions: Array<{ name: string; calories?: number; protein_g?: number; note?: string }> = [];
    try {
      const parsed = JSON.parse(raw) as { suggestions?: Array<{ name?: string; calories?: number; protein_g?: number; note?: string }> };
      suggestions = (parsed.suggestions ?? []).slice(0, 3).map((s) => ({
        name: typeof s.name === "string" ? s.name : "Meal",
        calories: typeof s.calories === "number" ? s.calories : undefined,
        protein_g: typeof s.protein_g === "number" ? s.protein_g : undefined,
        note: typeof s.note === "string" ? s.note : undefined,
      }));
    } catch {
      suggestions = [];
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("meal_suggestions_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "AI service error.");
  }
}
