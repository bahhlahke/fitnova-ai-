import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { toLocalDateString } from "@/lib/date/local-date";
import {
  adaptPlanFromWorkoutLog,
  adaptPlanFromNutritionLog,
  type WorkoutLogEntry,
  type NutritionLogEntry,
} from "@/lib/plan/adapt-from-log";

export const dynamic = "force-dynamic";

type RequestBody = {
  type: "workout" | "nutrition";
  log_date?: string;
};

/**
 * POST /api/v1/plan/adapt-from-log
 *
 * Called after a user saves a workout or nutrition log entry. Compares the
 * actual logged data against what was planned, then re-evaluates the remaining
 * days in the current weekly plan so tomorrow's session automatically reflects
 * what was actually done today.
 *
 * Body:
 *   { type: "workout" | "nutrition", log_date?: string }
 *
 * log_date defaults to today (local) if omitted.
 */
export async function POST(request: Request) {
  const requestId = makeRequestId();

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid JSON body.");
  }

  if (body.type !== "workout" && body.type !== "nutrition") {
    return jsonError(400, "VALIDATION_ERROR", 'body.type must be "workout" or "nutrition".');
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
    }

    const logDate = body.log_date ?? toLocalDateString();

    if (body.type === "workout") {
      // Fetch the most recently saved workout log for this date
      const { data: logRows } = await supabase
        .from("workout_logs")
        .select("workout_type, duration_minutes, exercises, perceived_exertion, notes")
        .eq("user_id", user.id)
        .eq("date", logDate)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!logRows || logRows.length === 0) {
        return jsonError(404, "NOT_FOUND", "No workout log found for the given date.");
      }

      const entry = logRows[0] as WorkoutLogEntry;
      const result = await adaptPlanFromWorkoutLog(supabase, user.id, logDate, entry);

      console.info("plan_adapted_from_workout", {
        requestId,
        userId: user.id,
        logDate,
        deviationType: result.deviation_type,
        updatedDays: result.updated_days,
      });

      // Persist for observability (best-effort)
      supabase.from("plan_adaptation_events").insert({
        user_id: user.id,
        log_date: logDate,
        log_type: "workout",
        deviation_type: result.deviation_type,
        updated_days: result.updated_days,
        adaptation_summary: result.adaptation_summary,
      }).then(undefined, () => { /* non-critical */ });

      return NextResponse.json(result);
    }

    // nutrition
    const { data: nutritionRows } = await supabase
      .from("nutrition_logs")
      .select("total_calories, macros")
      .eq("user_id", user.id)
      .eq("date", logDate)
      .order("created_at", { ascending: false })
      .limit(1);

    const entry: NutritionLogEntry =
      nutritionRows && nutritionRows.length > 0
        ? (nutritionRows[0] as NutritionLogEntry)
        : {};

    const result = await adaptPlanFromNutritionLog(supabase, user.id, logDate, entry);

    console.info("plan_adapted_from_nutrition", {
      requestId,
      userId: user.id,
      logDate,
      updated: result.updated,
      updatedDays: result.updated_days,
    });

    // Persist for observability (best-effort)
    if (result.updated) {
      supabase.from("plan_adaptation_events").insert({
        user_id: user.id,
        log_date: logDate,
        log_type: "nutrition",
        deviation_type: result.deviation_type,
        updated_days: result.updated_days,
        adaptation_summary: result.adaptation_summary,
      }).then(undefined, () => { /* non-critical */ });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("adapt_from_log_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Internal server error.");
  }
}
