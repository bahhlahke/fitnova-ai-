import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { toLocalDateString } from "@/lib/date/local-date";
import { buildProgressionAnalytics } from "@/lib/analytics/progression";

export const dynamic = "force-dynamic";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toRecoveryFraction(raw: number | null | undefined): number | null {
  if (raw == null || !Number.isFinite(raw)) return null;
  if (raw > 1) return clamp(raw / 100, 0, 1);
  return clamp(raw, 0, 1);
}

export async function GET(request: Request) {
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
    const today = url.searchParams.get("today") || toLocalDateString();
    const todayMs = new Date(`${today}T12:00:00`).getTime();
    const fourteenDaysAgo = toLocalDateString(new Date(todayMs - 14 * 24 * 60 * 60 * 1000));
    const thirtyDaysAgo = toLocalDateString(new Date(todayMs - 30 * 24 * 60 * 60 * 1000));

    const [workoutsRes, nutritionRes, plansRes, checkInsRes, snapshotsRes, signalsRes, adherenceRes] = await Promise.all([
      supabase
        .from("workout_logs")
        .select("date, workout_type, duration_minutes, exercises")
        .eq("user_id", user.id)
        .gte("date", thirtyDaysAgo)
        .lte("date", today),
      supabase
        .from("nutrition_logs")
        .select("date, total_calories")
        .eq("user_id", user.id)
        .gte("date", fourteenDaysAgo)
        .lte("date", today),
      supabase
        .from("daily_plans")
        .select("date_local, plan_json")
        .eq("user_id", user.id)
        .gte("date_local", fourteenDaysAgo)
        .lte("date_local", today),
      supabase
        .from("check_ins")
        .select("date_local, sleep_hours, energy_score")
        .eq("user_id", user.id)
        .gte("date_local", fourteenDaysAgo)
        .lte("date_local", today),
      supabase
        .from("progression_snapshots")
        .select("exercise_name, e1rm, total_volume, trend_score, sample_size")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(30),
      supabase
        .from("connected_signals")
        .select("signal_date, recovery_score, strain_score, sleep_hours, resting_hr, hrv")
        .eq("user_id", user.id)
        .eq("provider", "whoop")
        .gte("signal_date", fourteenDaysAgo)
        .lte("signal_date", today)
        .order("signal_date", { ascending: false })
        .limit(14),
      supabase
        .from("nutrition_adherence_daily")
        .select("date_local, total_score")
        .eq("user_id", user.id)
        .gte("date_local", fourteenDaysAgo)
        .lte("date_local", today),
    ]);

    const workouts = (workoutsRes.data ?? []) as Array<{
      date: string;
      workout_type?: string;
      duration_minutes?: number | null;
      exercises?: Array<{ sets?: number; reps?: string; name?: string; performed_sets?: Array<{ reps?: number | string; weight_kg?: number | null }> }>;
    }>;

    const nutrition = (nutritionRes.data ?? []) as Array<{ total_calories?: number | null }>;
    const plans = (plansRes.data ?? []) as Array<{
      date_local: string;
      plan_json?: {
        nutrition_plan?: { calorie_target?: number };
      };
    }>;
    const checkIns = (checkInsRes.data ?? []) as Array<{ sleep_hours?: number | null; energy_score?: number | null }>;
    const progressionSnapshots = (snapshotsRes.data ?? []) as Array<{
      exercise_name: string;
      e1rm?: number | null;
      total_volume?: number | null;
      trend_score?: number | null;
      sample_size?: number | null;
    }>;
    const recoverySignals = (signalsRes.data ?? []) as Array<{
      signal_date: string;
      recovery_score?: number | null;
      strain_score?: number | null;
      sleep_hours?: number | null;
      resting_hr?: number | null;
      hrv?: number | null;
    }>;
    const adherenceRows = (adherenceRes.data ?? []) as Array<{ date_local: string; total_score?: number | null }>;

    const recentWorkouts = workouts.filter((entry) => entry.date >= fourteenDaysAgo);

    const workoutDays = new Set(recentWorkouts.map((entry) => entry.date)).size;
    const workoutMinutes = recentWorkouts.reduce((sum, entry) => sum + (entry.duration_minutes ?? 0), 0);

    const estimatedSets = recentWorkouts.reduce((sum, entry) => {
      const fromExercises = (entry.exercises ?? []).reduce(
        (inner, exercise) => inner + (exercise.sets ?? (exercise.performed_sets?.length ?? 0)),
        0
      );
      return sum + (fromExercises > 0 ? fromExercises : Math.max(3, Math.round((entry.duration_minutes ?? 30) / 10)));
    }, 0);

    const pushCount = recentWorkouts.filter((entry) => /push|press/i.test(entry.workout_type ?? "")).length;
    const pullCount = recentWorkouts.filter((entry) => /pull|row|back/i.test(entry.workout_type ?? "")).length;
    const pushPullBalance = pullCount === 0 ? 1 : Math.round((pushCount / pullCount) * 100) / 100;

    const caloriesLoggedAvg =
      nutrition.length > 0
        ? Math.round(nutrition.reduce((sum, entry) => sum + (entry.total_calories ?? 0), 0) / nutrition.length)
        : null;

    const calorieTargets = plans
      .map((entry) => entry.plan_json?.nutrition_plan?.calorie_target)
      .filter((value): value is number => Number.isFinite(value));

    const avgCalorieTarget =
      calorieTargets.length > 0
        ? Math.round(calorieTargets.reduce((sum, value) => sum + value, 0) / calorieTargets.length)
        : null;

    const nutritionCompliance =
      caloriesLoggedAvg != null && avgCalorieTarget != null && avgCalorieTarget > 0
        ? clamp(1 - Math.abs(caloriesLoggedAvg - avgCalorieTarget) / avgCalorieTarget, 0, 1)
        : null;

    const avgSleep =
      checkIns.length > 0
        ? checkIns.reduce((sum, entry) => sum + (entry.sleep_hours ?? 7), 0) / checkIns.length
        : 7;

    const avgEnergy =
      checkIns.length > 0
        ? checkIns.reduce((sum, entry) => sum + (entry.energy_score ?? 3), 0) / checkIns.length
        : 3;

    const recoveryDebt = clamp((7.5 - avgSleep) / 3 + (3.5 - avgEnergy) / 3, 0, 1);

    const progression = buildProgressionAnalytics(workouts, progressionSnapshots, adherenceRows);

    const latestRecovery = recoverySignals[0] ?? null;
    const recoveryReadiness = toRecoveryFraction(latestRecovery?.recovery_score ?? null);

    return NextResponse.json({
      period_days: 14,
      workout_days: workoutDays,
      workout_minutes: workoutMinutes,
      estimated_total_sets: estimatedSets,
      push_pull_balance: pushPullBalance,
      avg_logged_calories: caloriesLoggedAvg,
      avg_target_calories: avgCalorieTarget,
      nutrition_compliance: nutritionCompliance != null ? Math.round(nutritionCompliance * 100) / 100 : null,
      recovery_debt: Math.round(recoveryDebt * 100) / 100,
      avg_sleep_hours: Math.round(avgSleep * 10) / 10,
      avg_energy_score: Math.round(avgEnergy * 10) / 10,
      progression_e1rm_metrics: progression.metrics,
      progression_trend_points: progression.trend_points,
      progression_adherence: progression.adherence_avg,
      latest_recovery_signal: latestRecovery,
      recovery_readiness: recoveryReadiness,
    });
  } catch (error) {
    console.error("analytics_performance_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Failed to compute analytics.");
  }
}
