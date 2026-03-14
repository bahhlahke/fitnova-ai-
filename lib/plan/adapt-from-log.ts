/**
 * adapt-from-log.ts
 *
 * Closes the feedback loop between user-logged workouts/nutrition and the
 * weekly plan. When a user logs a session that differs from what was planned,
 * this module re-evaluates the remaining days in the current weekly plan and
 * updates them accordingly.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { toLocalDateString } from "@/lib/date/local-date";
import type { WeeklyPlan, WeeklyPlanDay } from "@/lib/plan/types";

// ---------------------------------------------------------------------------
// Muscle group mappings
// ---------------------------------------------------------------------------

/** Map focus keywords → muscle groups that need ≥48h recovery */
const FOCUS_MUSCLE_MAP: Array<{ keywords: string[]; groups: string[] }> = [
  { keywords: ["upper push", "push", "chest", "shoulder", "tricep", "press", "dip"], groups: ["chest", "shoulders", "triceps"] },
  { keywords: ["upper pull", "pull", "back", "bicep", "row", "lat"], groups: ["back", "biceps"] },
  { keywords: ["lower push", "squat", "quad", "leg press", "lunge"], groups: ["quads", "glutes"] },
  { keywords: ["lower pull", "hinge", "hamstring", "posterior", "deadlift", "rdl", "glute bridge", "hip thrust"], groups: ["hamstrings", "glutes"] },
  { keywords: ["full body", "hybrid", "complex"], groups: ["chest", "back", "quads", "hamstrings", "shoulders"] },
  { keywords: ["cardio", "conditioning", "aerobic", "interval", "hiit"], groups: ["cardiovascular"] },
  { keywords: ["mobility", "recovery", "movement quality", "flexibility", "stretch"], groups: ["flexibility"] },
  { keywords: ["upper"], groups: ["chest", "back", "shoulders"] },
  { keywords: ["lower"], groups: ["quads", "hamstrings"] },
];

const TYPE_MUSCLE_MAP: Record<string, string[]> = {
  strength: ["chest", "back", "shoulders", "quads", "hamstrings"],
  cardio: ["cardiovascular"],
  mobility: ["flexibility"],
  other: [],
};

function getMuscleGroupsFromFocus(focus: string): string[] {
  const normalized = focus.toLowerCase();
  for (const entry of FOCUS_MUSCLE_MAP) {
    if (entry.keywords.some((k) => normalized.includes(k))) {
      return entry.groups;
    }
  }
  return [];
}

function hasMuscleOverlap(a: string[], b: string[]): boolean {
  const structural = (g: string) => g !== "cardiovascular" && g !== "flexibility";
  return a.some((g) => structural(g) && b.includes(g));
}

// ---------------------------------------------------------------------------
// Intensity helpers
// ---------------------------------------------------------------------------

function downgradeIntensity(
  intensity: "low" | "moderate" | "high"
): "low" | "moderate" | "high" {
  if (intensity === "high") return "moderate";
  return "low";
}

function workoutMatchesFocus(actualType: string, plannedFocus: string): boolean {
  const f = plannedFocus.toLowerCase();
  if (actualType === "strength") {
    return (
      f.includes("strength") ||
      f.includes("push") ||
      f.includes("pull") ||
      f.includes("upper") ||
      f.includes("lower") ||
      f.includes("squat") ||
      f.includes("deadlift") ||
      f.includes("hypertrophy") ||
      f.includes("compound") ||
      f.includes("full body")
    );
  }
  if (actualType === "cardio") {
    return (
      f.includes("cardio") ||
      f.includes("conditioning") ||
      f.includes("interval") ||
      f.includes("aerobic") ||
      f.includes("hiit")
    );
  }
  if (actualType === "mobility") {
    return (
      f.includes("mobility") ||
      f.includes("recovery") ||
      f.includes("stretch") ||
      f.includes("movement quality")
    );
  }
  return false;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface WorkoutLogEntry {
  workout_type: string;
  duration_minutes?: number | null;
  exercises?: Array<{ name?: string }> | null;
  perceived_exertion?: number | null;
  notes?: string | null;
}

export interface NutritionLogEntry {
  total_calories?: number | null;
  macros?: {
    protein_g?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
  } | null;
}

export interface AdaptationResult {
  updated: boolean;
  adaptation_summary: string;
  deviation_type: "on_plan" | "harder" | "easier" | "different_type";
  updated_days: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWeekStartLocal(date = new Date()): string {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(diff);
  return toLocalDateString(monday);
}

// ---------------------------------------------------------------------------
// Core: adapt weekly plan from a logged workout
// ---------------------------------------------------------------------------

export async function adaptPlanFromWorkoutLog(
  supabase: SupabaseClient,
  userId: string,
  logDate: string,
  logEntry: WorkoutLogEntry
): Promise<AdaptationResult> {
  const weekStartLocal = getWeekStartLocal();

  const { data: weeklyPlanRow } = await supabase
    .from("weekly_plans")
    .select("plan_json")
    .eq("user_id", userId)
    .eq("week_start_local", weekStartLocal)
    .maybeSingle();

  if (!weeklyPlanRow?.plan_json) {
    return {
      updated: false,
      adaptation_summary: "No weekly plan found for the current week — generate one to enable adaptive planning.",
      deviation_type: "on_plan",
      updated_days: [],
    };
  }

  const plan = weeklyPlanRow.plan_json as WeeklyPlan;
  const todayIndex = plan.days.findIndex((d) => d.date_local === logDate);

  if (todayIndex < 0) {
    return {
      updated: false,
      adaptation_summary: "Today is outside the current weekly plan window.",
      deviation_type: "on_plan",
      updated_days: [],
    };
  }

  const todaySlot = plan.days[todayIndex];
  const plannedFocus = todaySlot.focus;
  const plannedIntensity = todaySlot.intensity;
  const plannedDuration = todaySlot.target_duration_minutes;

  // Actual workout signals
  const actualType = logEntry.workout_type;
  const actualDuration = logEntry.duration_minutes ?? null;
  // RPE may come from perceived_exertion column or legacy notes field (the quick-log form stored it there)
  const rpeFromNotes = logEntry.notes ? parseFloat(logEntry.notes) : null;
  const actualRPE =
    typeof logEntry.perceived_exertion === "number"
      ? logEntry.perceived_exertion
      : rpeFromNotes && !isNaN(rpeFromNotes) && rpeFromNotes >= 1 && rpeFromNotes <= 10
        ? rpeFromNotes
        : null;

  // Muscle groups actually trained
  const actualMuscleGroups: string[] = TYPE_MUSCLE_MAP[actualType] ?? [];

  // Classify deviation
  const typeMatches = workoutMatchesFocus(actualType, plannedFocus);
  const durationRatio =
    actualDuration && plannedDuration ? actualDuration / plannedDuration : 1;

  let deviationType: "on_plan" | "harder" | "easier" | "different_type" = "on_plan";

  if (!typeMatches) {
    deviationType = "different_type";
  } else if ((actualRPE !== null && actualRPE >= 8) || durationRatio >= 1.2) {
    deviationType = "harder";
  } else if ((actualRPE !== null && actualRPE <= 4) || durationRatio <= 0.65) {
    deviationType = "easier";
  }

  const updatedDays: string[] = [];
  const changeSummaryParts: string[] = [];

  // Mark today as completed with actual data
  plan.days[todayIndex] = {
    ...todaySlot,
    rationale: `${todaySlot.rationale} | Completed: ${actualType}${actualDuration ? `, ${actualDuration} min` : ""}${actualRPE ? `, RPE ${actualRPE}` : ""}.`,
  };

  let pendingMakeupFocus: string | null = null;

  if (deviationType === "different_type") {
    const isPlannedStrength =
      plannedFocus.toLowerCase().includes("strength") ||
      plannedFocus.toLowerCase().includes("push") ||
      plannedFocus.toLowerCase().includes("pull") ||
      plannedFocus.toLowerCase().includes("upper") ||
      plannedFocus.toLowerCase().includes("lower") ||
      plannedFocus.toLowerCase().includes("squat") ||
      plannedFocus.toLowerCase().includes("hypertrophy");

    if (isPlannedStrength && actualType !== "strength") {
      pendingMakeupFocus = plannedFocus;
      changeSummaryParts.push(
        `Today's planned session (${plannedFocus}) was replaced by a ${actualType} workout`
      );
    }
  }

  // Adapt future days
  for (let i = todayIndex + 1; i < plan.days.length; i++) {
    const day = plan.days[i];
    const dayMuscleGroups = getMuscleGroupsFromFocus(day.focus);
    const isNextDay = i === todayIndex + 1;
    let modified = false;
    const dayChanges: string[] = [];

    // Rule 1 — If today was harder than planned, downgrade tomorrow's intensity
    if (isNextDay && deviationType === "harder" && day.intensity !== "low") {
      const newIntensity = downgradeIntensity(day.intensity);
      plan.days[i] = {
        ...day,
        intensity: newIntensity,
        rationale: `${day.rationale} | Intensity stepped down — yesterday exceeded the planned load (${actualDuration ?? "?"}min, RPE ${actualRPE ?? "?"}).`,
      };
      dayChanges.push(`intensity ${day.intensity}→${newIntensity}`);
      modified = true;
    }

    // Rule 2 — Muscle group overlap: if today's muscles collide with tomorrow, moderate or note recovery
    if (isNextDay && hasMuscleOverlap(actualMuscleGroups, dayMuscleGroups)) {
      const overlapping = actualMuscleGroups.filter((g) => dayMuscleGroups.includes(g));
      const currentDay = plan.days[i];
      if (currentDay.intensity === "high") {
        plan.days[i] = {
          ...currentDay,
          intensity: "moderate",
          rationale: `${currentDay.rationale} | Volume moderated — ${overlapping.join(", ")} were trained yesterday and need recovery.`,
        };
        dayChanges.push(`recovery buffer added for ${overlapping.join(", ")}`);
        modified = true;
      } else if (currentDay.intensity === "moderate") {
        plan.days[i] = {
          ...currentDay,
          rationale: `${currentDay.rationale} | Note: ${overlapping.join(", ")} were trained yesterday — keep loads conservative.`,
        };
        dayChanges.push(`recovery note added for ${overlapping.join(", ")}`);
        modified = true;
      }
    }

    // Rule 3 — Insert a make-up session for a missed planned strength day, on the next low-intensity slot
    if (
      pendingMakeupFocus &&
      day.intensity === "low" &&
      !day.focus.toLowerCase().includes("strength") &&
      !day.focus.toLowerCase().includes("push") &&
      !day.focus.toLowerCase().includes("pull")
    ) {
      plan.days[i] = {
        ...day,
        focus: `${plannedFocus} (make-up) + ${day.focus}`,
        rationale: `${day.rationale} | Make-up: originally scheduled ${plannedFocus} was not completed as planned on ${logDate}.`,
      };
      dayChanges.push(`make-up session for ${plannedFocus} inserted`);
      modified = true;
      pendingMakeupFocus = null;
    }

    if (modified) {
      updatedDays.push(day.date_local);
      changeSummaryParts.push(`${day.date_local} (${day.day_label}): ${dayChanges.join(", ")}`);
    }
  }

  // Persist the updated plan
  await supabase
    .from("weekly_plans")
    .upsert(
      { user_id: userId, week_start_local: weekStartLocal, plan_json: plan },
      { onConflict: "user_id,week_start_local" }
    );

  // Build human-readable summary
  let summary: string;
  if (deviationType === "on_plan") {
    summary = `Session logged — today matched the plan (${plannedFocus}). Upcoming days remain as scheduled.`;
  } else if (deviationType === "harder") {
    summary = `You trained harder than planned today (${actualDuration ?? "?"}min${actualRPE ? `, RPE ${actualRPE}` : ""}). Tomorrow's intensity has been eased to support recovery.`;
  } else if (deviationType === "easier") {
    summary = `Today's session was lighter than planned. Upcoming days remain as scheduled — you're on track.`;
  } else {
    const makeupNote = pendingMakeupFocus === null && changeSummaryParts.some((s) => s.includes("make-up"))
      ? " A make-up session has been added to an upcoming rest day."
      : pendingMakeupFocus
        ? " No rest-day slot was available this week to reschedule it — consider adding it next week."
        : "";
    summary = `You did ${actualType} instead of the planned ${plannedFocus}.${makeupNote}`;
  }

  if (changeSummaryParts.length > 0) {
    summary += " Updated: " + changeSummaryParts.join("; ") + ".";
  }

  return {
    updated: true,
    adaptation_summary: summary,
    deviation_type: deviationType,
    updated_days: updatedDays,
  };
}

// ---------------------------------------------------------------------------
// Core: adapt from a logged nutrition entry
// ---------------------------------------------------------------------------

export async function adaptPlanFromNutritionLog(
  supabase: SupabaseClient,
  userId: string,
  logDate: string,
  entry: NutritionLogEntry
): Promise<AdaptationResult> {
  const weekStartLocal = getWeekStartLocal();

  const { data: weeklyPlanRow } = await supabase
    .from("weekly_plans")
    .select("plan_json")
    .eq("user_id", userId)
    .eq("week_start_local", weekStartLocal)
    .maybeSingle();

  if (!weeklyPlanRow?.plan_json) {
    return {
      updated: false,
      adaptation_summary: "No weekly plan found. Tomorrow's daily plan will incorporate today's nutrition when generated.",
      deviation_type: "on_plan",
      updated_days: [],
    };
  }

  const plan = weeklyPlanRow.plan_json as WeeklyPlan;
  const todayIndex = plan.days.findIndex((d) => d.date_local === logDate);
  if (todayIndex < 0) {
    return {
      updated: false,
      adaptation_summary: "Today is outside the current weekly plan window.",
      deviation_type: "on_plan",
      updated_days: [],
    };
  }

  const actualCalories = entry.total_calories ?? 0;
  const actualProtein = entry.macros?.protein_g ?? 0;

  // Determine whether deviation is significant enough to annotate upcoming days
  // Thresholds: >400 kcal surplus or >400 kcal deficit; or <80g protein
  const isSurplus = actualCalories > 0 && actualCalories > 2800;
  const isDeficit = actualCalories > 0 && actualCalories < 1400;
  const isLowProtein = actualProtein > 0 && actualProtein < 80;

  const notes: string[] = [];
  if (isSurplus) notes.push(`caloric surplus logged today (${actualCalories} kcal) — hydration and next-day targets adjusted`);
  if (isDeficit) notes.push(`significant caloric deficit today (${actualCalories} kcal) — ensure tomorrow's targets support recovery`);
  if (isLowProtein) notes.push(`low protein logged today (${actualProtein}g) — prioritise protein-rich meals tomorrow`);

  if (notes.length === 0) {
    return {
      updated: false,
      adaptation_summary: "Nutrition logged. Tomorrow's plan will automatically use today's intake data when generated.",
      deviation_type: "on_plan",
      updated_days: [],
    };
  }

  // Annotate tomorrow in the weekly plan rationale so the daily composer picks it up
  const updatedDays: string[] = [];
  if (todayIndex + 1 < plan.days.length) {
    const tomorrow = plan.days[todayIndex + 1];
    plan.days[todayIndex + 1] = {
      ...tomorrow,
      rationale: `${tomorrow.rationale} | Nutrition signal from ${logDate}: ${notes.join("; ")}.`,
    };
    updatedDays.push(tomorrow.date_local);

    await supabase
      .from("weekly_plans")
      .upsert(
        { user_id: userId, week_start_local: weekStartLocal, plan_json: plan },
        { onConflict: "user_id,week_start_local" }
      );
  }

  return {
    updated: updatedDays.length > 0,
    adaptation_summary: `Nutrition logged and plan updated. Note for tomorrow: ${notes.join("; ")}.`,
    deviation_type: "on_plan",
    updated_days: updatedDays,
  };
}
