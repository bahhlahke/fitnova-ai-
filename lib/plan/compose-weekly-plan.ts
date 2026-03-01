import { toLocalDateString } from "@/lib/date/local-date";
import type { PlannerDataSources, WeeklyPlan, WeeklyPlanDay } from "@/lib/plan/types";

function getWeekStart(date = new Date()): Date {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(diff);
  return monday;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function pickCycleTemplate(goals: string[]): Array<{ focus: string; intensity: "low" | "moderate" | "high"; minutes: number }> {
  const normalized = goals.map((goal) => goal.toLowerCase());

  if (normalized.some((goal) => goal.includes("endurance"))) {
    return [
      { focus: "Aerobic base + mobility", intensity: "moderate", minutes: 45 },
      { focus: "Strength support", intensity: "moderate", minutes: 40 },
      { focus: "Interval conditioning", intensity: "high", minutes: 35 },
      { focus: "Recovery + mobility", intensity: "low", minutes: 30 },
      { focus: "Tempo cardio", intensity: "high", minutes: 45 },
      { focus: "Hybrid strength", intensity: "moderate", minutes: 45 },
      { focus: "Full recovery", intensity: "low", minutes: 25 },
    ];
  }

  if (normalized.some((goal) => goal.includes("muscle"))) {
    return [
      { focus: "Upper strength", intensity: "high", minutes: 55 },
      { focus: "Lower strength", intensity: "high", minutes: 55 },
      { focus: "Active recovery", intensity: "low", minutes: 30 },
      { focus: "Pull + posterior chain", intensity: "moderate", minutes: 50 },
      { focus: "Push + conditioning", intensity: "moderate", minutes: 45 },
      { focus: "Accessory hypertrophy", intensity: "moderate", minutes: 45 },
      { focus: "Recovery", intensity: "low", minutes: 25 },
    ];
  }

  if (normalized.some((goal) => goal.includes("mobility"))) {
    return [
      { focus: "Mobility flow", intensity: "low", minutes: 30 },
      { focus: "Full body technique", intensity: "moderate", minutes: 40 },
      { focus: "Mobility + core", intensity: "low", minutes: 30 },
      { focus: "Strength quality", intensity: "moderate", minutes: 45 },
      { focus: "Mobility + cardio", intensity: "moderate", minutes: 35 },
      { focus: "Movement quality", intensity: "low", minutes: 30 },
      { focus: "Recovery", intensity: "low", minutes: 25 },
    ];
  }

  // Default / fat-loss / general fitness template.
  return [
    { focus: "Full body strength", intensity: "high", minutes: 50 },
    { focus: "Conditioning + core", intensity: "moderate", minutes: 40 },
    { focus: "Lower body strength", intensity: "high", minutes: 50 },
    { focus: "Recovery + mobility", intensity: "low", minutes: 30 },
    { focus: "Upper body strength", intensity: "moderate", minutes: 45 },
    { focus: "Hybrid conditioning", intensity: "moderate", minutes: 40 },
    { focus: "Recovery", intensity: "low", minutes: 25 },
  ];
}

function parsePreferredTrainingDays(profile: Record<string, unknown>): number[] {
  const devices = (profile.devices ?? {}) as Record<string, unknown>;
  const schedule = (devices.training_schedule ?? {}) as Record<string, unknown>;
  const days = schedule.preferred_training_days;
  if (!Array.isArray(days)) return [1, 2, 3, 4, 5];
  const normalized = days
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 6);
  return normalized.length > 0 ? normalized : [1, 2, 3, 4, 5];
}

function localWeekday(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

export async function composeWeeklyPlan(
  dataSources: PlannerDataSources,
  date = new Date()
): Promise<WeeklyPlan> {
  const { supabase, userId } = dataSources;
  const weekStartDate = getWeekStart(date);
  const weekStart = toLocalDateString(weekStartDate);

  const [profileRes, workoutsRes, checkInsRes] = await Promise.all([
    supabase.from("user_profile").select("goals, devices").eq("user_id", userId).maybeSingle(),
    supabase
      .from("workout_logs")
      .select("date, workout_type, duration_minutes")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(30),
    supabase
      .from("check_ins")
      .select("date_local, energy_score, sleep_hours, soreness_notes")
      .eq("user_id", userId)
      .order("date_local", { ascending: false })
      .limit(14),
  ]);

  const profile = (profileRes.data ?? {}) as Record<string, unknown>;
  const goals = Array.isArray(profile.goals) ? (profile.goals as string[]) : [];
  const preferredTrainingDays = parsePreferredTrainingDays(profile);

  const workouts = (workoutsRes.data ?? []) as Array<{
    date: string;
    workout_type?: string;
    duration_minutes?: number | null;
  }>;

  const recentCheckIns = (checkInsRes.data ?? []) as Array<{
    energy_score?: number | null;
    sleep_hours?: number | null;
    soreness_notes?: string | null;
  }>;

  const avgSleep =
    recentCheckIns.length > 0
      ? recentCheckIns.reduce((sum, entry) => sum + (entry.sleep_hours ?? 7), 0) / recentCheckIns.length
      : 7;

  const lowEnergyDays = recentCheckIns.filter((entry) => (entry.energy_score ?? 3) <= 2).length;
  const sorenessFlags = recentCheckIns.filter((entry) => (entry.soreness_notes ?? "").trim().length > 0).length;

  const template = pickCycleTemplate(goals);
  const days: WeeklyPlanDay[] = [];

  for (let i = 0; i < 7; i += 1) {
    const slotDate = addDays(weekStartDate, i);
    const slotDateLocal = toLocalDateString(slotDate);
    const slotWeekday = slotDate.getDay();
    const base = template[i];
    const isPreferredDay = preferredTrainingDays.includes(slotWeekday);

    let intensity = base.intensity;
    let duration = base.minutes;

    if (!isPreferredDay) {
      intensity = "low";
      duration = Math.min(30, base.minutes);
    }

    if (avgSleep < 6.5 || lowEnergyDays >= 3 || sorenessFlags >= 3) {
      if (intensity === "high") intensity = "moderate";
      else if (intensity === "moderate") intensity = "low";
      duration = Math.max(25, Math.round(duration * 0.85));
    }

    const rationaleParts = [
      isPreferredDay ? "Aligned with preferred schedule" : "Configured as lighter non-preferred day",
      avgSleep < 6.5 ? `Average sleep (${avgSleep.toFixed(1)}h) reduced intensity` : "Sleep trend supports current load",
    ];

    days.push({
      date_local: slotDateLocal,
      day_label: localWeekday(slotDate),
      focus: isPreferredDay ? base.focus : "Recovery and movement quality",
      intensity,
      target_duration_minutes: duration,
      rationale: rationaleParts.join(". "),
    });
  }

  const weeklyWorkoutCount = workouts.filter((entry) => entry.date >= weekStart).length;
  const cycleGoal = goals.length > 0 ? goals.join(", ") : "General fitness and consistency";
  const adaptationSummary = `Planned ${days.filter((day) => day.intensity !== "low").length} training-focused days this week. Recent completed sessions this week: ${weeklyWorkoutCount}. Sleep and soreness signals are used to downshift high-intensity days when recovery is limited.`;

  return {
    week_start_local: weekStart,
    cycle_goal: cycleGoal,
    adaptation_summary: adaptationSummary,
    days,
  };
}
