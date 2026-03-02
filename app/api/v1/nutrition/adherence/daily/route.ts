import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { toLocalDateString } from "@/lib/date/local-date";

export const dynamic = "force-dynamic";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function computeTargetAdherence(actual: number | null, target: number | null): number | null {
  if (actual == null || target == null || target <= 0) return null;
  return clamp(1 - Math.abs(actual - target) / target, 0, 1);
}

function extractMacroTotals(meals: Array<Record<string, unknown>>): { protein: number; carbs: number; fat: number } {
  let protein = 0;
  let carbs = 0;
  let fat = 0;

  for (const meal of meals) {
    const macros = (meal.macros ?? {}) as Record<string, unknown>;
    protein += Number(macros.protein ?? 0) || 0;
    carbs += Number(macros.carbs ?? 0) || 0;
    fat += Number(macros.fat ?? 0) || 0;
  }

  return { protein, carbs, fat };
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function POST(request: Request) {
  const requestId = makeRequestId();

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
    }

    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const dateLocal = (() => {
      const raw = url.searchParams.get("date") ?? body.localDate ?? "";
      return isValidDate(raw) ? raw : toLocalDateString();
    })();

    const [targetRes, logRes] = await Promise.all([
      supabase
        .from("nutrition_targets")
        .select("target_id, calorie_target, protein_target_g, carbs_target_g, fat_target_g, meal_timing")
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle(),
      supabase
        .from("nutrition_logs")
        .select("log_id, meals, total_calories")
        .eq("user_id", user.id)
        .eq("date", dateLocal)
        .maybeSingle(),
    ]);

    if (targetRes.error || logRes.error) {
      return jsonError(500, "INTERNAL_ERROR", "Failed to load nutrition records.");
    }

    const target = (targetRes.data ?? null) as
      | {
        calorie_target?: number | null;
        protein_target_g?: number | null;
        carbs_target_g?: number | null;
        fat_target_g?: number | null;
        meal_timing?: Array<{ label?: string; window?: string }>;
      }
      | null;

    const log = (logRes.data ?? null) as
      | {
        total_calories?: number | null;
        meals?: Array<Record<string, unknown>>;
      }
      | null;

    const meals = Array.isArray(log?.meals) ? log.meals : [];
    const calories = typeof log?.total_calories === "number" ? log.total_calories : null;
    const macroTotals = extractMacroTotals(meals);

    const calorieAdherence = computeTargetAdherence(calories, target?.calorie_target ?? null);
    const proteinAdherence = computeTargetAdherence(macroTotals.protein, target?.protein_target_g ?? null);
    const carbAdherence = computeTargetAdherence(macroTotals.carbs, target?.carbs_target_g ?? null);
    const fatAdherence = computeTargetAdherence(macroTotals.fat, target?.fat_target_g ?? null);

    const macroComponents = [proteinAdherence, carbAdherence, fatAdherence].filter(
      (value): value is number => value != null
    );

    const macroAdherence =
      macroComponents.length > 0
        ? macroComponents.reduce((sum, value) => sum + value, 0) / macroComponents.length
        : null;

    const mealTimingTarget = Array.isArray(target?.meal_timing) ? target?.meal_timing : [];
    const mealTimingAdherence =
      mealTimingTarget.length > 0
        ? clamp((meals.length || 0) / mealTimingTarget.length, 0, 1)
        : null;

    const weightedParts = [
      calorieAdherence != null ? { weight: 0.5, value: calorieAdherence } : null,
      macroAdherence != null ? { weight: 0.35, value: macroAdherence } : null,
      mealTimingAdherence != null ? { weight: 0.15, value: mealTimingAdherence } : null,
    ].filter((entry): entry is { weight: number; value: number } => entry != null);

    const totalScore =
      weightedParts.length > 0
        ? weightedParts.reduce((sum, entry) => sum + entry.weight * entry.value, 0) /
        weightedParts.reduce((sum, entry) => sum + entry.weight, 0)
        : null;

    const details = {
      calories,
      targets: {
        calories: target?.calorie_target ?? null,
        protein: target?.protein_target_g ?? null,
        carbs: target?.carbs_target_g ?? null,
        fat: target?.fat_target_g ?? null,
      },
      macro_totals: macroTotals,
      meals_logged: meals.length,
      meal_timing_target_count: mealTimingTarget.length,
    };

    const upsertRes = await supabase.from("nutrition_adherence_daily").upsert(
      {
        user_id: user.id,
        date_local: dateLocal,
        calorie_adherence: calorieAdherence == null ? null : round(calorieAdherence),
        macro_adherence: macroAdherence == null ? null : round(macroAdherence),
        meal_timing_adherence: mealTimingAdherence == null ? null : round(mealTimingAdherence),
        total_score: totalScore == null ? null : round(totalScore),
        details,
      },
      { onConflict: "user_id,date_local" }
    );

    if (upsertRes.error) {
      return jsonError(500, "INTERNAL_ERROR", "Failed to save adherence record.");
    }

    return NextResponse.json({
      date_local: dateLocal,
      calorie_adherence: calorieAdherence == null ? null : round(calorieAdherence),
      macro_adherence: macroAdherence == null ? null : round(macroAdherence),
      meal_timing_adherence: mealTimingAdherence == null ? null : round(mealTimingAdherence),
      total_score: totalScore == null ? null : round(totalScore),
      details,
    });
  } catch (error) {
    console.error("nutrition_adherence_daily_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Internal server error.");
  }
}
