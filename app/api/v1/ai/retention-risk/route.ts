import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { consumeToken } from "@/lib/api/rate-limit";
import { toLocalDateString } from "@/lib/date/local-date";

export const dynamic = "force-dynamic";

const RATE_LIMIT_CAPACITY = 20;
const RATE_LIMIT_REFILL_PER_SECOND = 20 / 60;

type RiskLevel = "low" | "medium" | "high";

function daysBetween(todayLocal: string, dateLocal: string | null): number | null {
  if (!dateLocal) return null;
  const a = new Date(`${todayLocal}T00:00:00`).getTime();
  const b = new Date(`${dateLocal}T00:00:00`).getTime();
  return Math.floor((a - b) / (24 * 60 * 60 * 1000));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toRiskLevel(score: number): RiskLevel {
  if (score >= 0.67) return "high";
  if (score >= 0.34) return "medium";
  return "low";
}

export async function POST() {
  const requestId = makeRequestId();

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
    }

    const limiter = consumeToken(
      `retention-risk:${user.id}`,
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

    const [workoutRes, nutritionRes, progressRes, planRes, checkInRes] = await Promise.all([
      supabase
        .from("workout_logs")
        .select("date")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("nutrition_logs")
        .select("date")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("progress_tracking")
        .select("date")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("daily_plans")
        .select("date_local")
        .eq("user_id", user.id)
        .eq("date_local", today)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("check_ins")
        .select("date_local")
        .eq("user_id", user.id)
        .order("date_local", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const lastWorkoutDate = (workoutRes.data as { date?: string } | null)?.date ?? null;
    const lastNutritionDate = (nutritionRes.data as { date?: string } | null)?.date ?? null;
    const lastProgressDate = (progressRes.data as { date?: string } | null)?.date ?? null;
    const hasPlanToday = !!(planRes.data as { date_local?: string } | null)?.date_local;
    const lastCheckInDate = (checkInRes.data as { date_local?: string } | null)?.date_local ?? null;

    const daysSinceWorkout = daysBetween(today, lastWorkoutDate);
    const daysSinceNutrition = daysBetween(today, lastNutritionDate);
    const daysSinceProgress = daysBetween(today, lastProgressDate);
    const daysSinceCheckIn = daysBetween(today, lastCheckInDate);

    const riskPoints = [
      daysSinceWorkout == null ? 20 : Math.min(35, daysSinceWorkout * 8),
      daysSinceNutrition == null ? 15 : Math.min(20, daysSinceNutrition * 4),
      daysSinceProgress == null ? 8 : Math.min(15, Math.max(0, daysSinceProgress - 3) * 2),
      daysSinceCheckIn == null ? 10 : Math.min(15, Math.max(0, daysSinceCheckIn - 2) * 3),
      hasPlanToday ? 0 : 12,
    ];

    const riskScore = clamp(riskPoints.reduce((sum, points) => sum + points, 0) / 100, 0, 1);
    const riskLevel = toRiskLevel(riskScore);

    const reasons: string[] = [];
    if (!hasPlanToday) reasons.push("No daily plan generated today");
    if (daysSinceWorkout != null && daysSinceWorkout >= 2) reasons.push(`${daysSinceWorkout} day(s) since last workout log`);
    if (daysSinceNutrition != null && daysSinceNutrition >= 2) reasons.push(`${daysSinceNutrition} day(s) since last nutrition log`);
    if (daysSinceCheckIn != null && daysSinceCheckIn >= 2) reasons.push(`${daysSinceCheckIn} day(s) since last check-in`);
    if (reasons.length === 0) reasons.push("Logging behavior is currently stable");

    const recommendedAction =
      riskLevel === "high"
        ? "Launch a 10-minute comeback workout and log one protein-forward meal today."
        : riskLevel === "medium"
          ? "Generate today’s plan and complete one key action (workout or nutrition log)."
          : "Maintain your streak with your normal routine and nightly check-in.";

    if (riskLevel !== "low") {
      await supabase.from("coach_nudges").upsert(
        {
          user_id: user.id,
          date_local: today,
          nudge_type: "retention_risk",
          risk_level: riskLevel,
          message: recommendedAction,
          delivered_via_sms: false,
        },
        { onConflict: "user_id,date_local,nudge_type" }
      );
    }

    return NextResponse.json({
      risk_score: Math.round(riskScore * 100) / 100,
      risk_level: riskLevel,
      reasons,
      recommended_action: recommendedAction,
    });
  } catch (error) {
    console.error("retention_risk_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Failed to assess retention risk.");
  }
}
