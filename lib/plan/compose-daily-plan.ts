import { toLocalDateString } from "@/lib/date/local-date";
import type { DailyPlan, DailyPlanTrainingExercise, PlannerDataSources, PlannerInputs } from "@/lib/plan/types";
import { normalizeGuidedExercise } from "@/lib/workout/guided-session";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeExerciseName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

function isRecoveryFocus(focus: string): boolean {
  const normalized = focus.toLowerCase();
  return (
    normalized.includes("recovery") ||
    normalized.includes("mobility") ||
    normalized.includes("movement quality") ||
    normalized.includes("stress-relief")
  );
}

function getWeekStartLocal(date: Date): string {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(diff);
  return toLocalDateString(monday);
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

/** Exercise pools per movement slot; [0] is preferred when not recently done. */
const SQUAT_POOL_GYM = ["Back Squat", "Goblet Squat", "Leg Press", "Front Squat", "Bulgarian Split Squat", "Box Squat"];
const SQUAT_POOL_HOME = ["Goblet Squat", "Bodyweight Squat", "Pistol Squat"];
const PUSH_POOL_GYM = ["Bench Press", "Incline Dumbbell Press", "Push-up", "Overhead Press", "Dips", "Close-Grip Bench"];
const PUSH_POOL_HOME = ["Push-up", "Incline Push-up", "Dumbbell Press", "Dips"];
const HINGE_POOL_GYM = ["Romanian Deadlift", "Dumbbell RDL", "Deadlift", "Deficit RDL", "Block Pull", "Kettlebell Swing"];
const HINGE_POOL_HOME = ["Dumbbell RDL", "Romanian Deadlift", "Kettlebell Swing"];
const PULL_POOL_GYM = ["Seated Row", "Dumbbell Row", "Lat Pulldown", "Barbell Row", "Chest-Supported Row", "Face Pulls", "Pull-up"];
const PULL_POOL_HOME = ["Single-arm Row", "Dumbbell Row", "Inverted Row", "Chin-up"];

const HIIT_POOL = ["Burpees", "Mountain Climbers", "Battle Ropes", "Sled Push", "Box Jumps", "Thrusters", "Wall Balls", "Devil Press"];
const MOBILITY_POOL = ["World's Greatest Stretch", "Pigeon Stretch", "90/90 Hip Switches", "Cat-Cow", "Thoracic Rotations", "Scorpion Stretch", "Couch Stretch"];
const ACCESSORY_POOL = ["DB Lateral Raise", "Bicep Curl", "Tricep Rope Pushdown", "Hammer Curl", "Overhead Tricep Ext", "Leg Extension", "Leg Curl", "Calf Raise"];


function pickFromPool(pool: string[], recentNormalized: Set<string>): string {
  for (const name of pool) {
    if (!recentNormalized.has(normalizeExerciseName(name))) return name;
  }
  return pool[0];
}

const STICKING_POINT_ACCESSORIES: Record<string, string> = {
  "back squat": "Pause Squat",
  "goblet squat": "Tempo Goblet Squat",
  "bench press": "Close-Grip Bench Press",
  "push-up": "Decline Push-up",
  "romanian deadlift": "Deficit RDL",
  "deadlift": "Block Pull",
  "seated row": "Chest-Supported Row",
  "dumbbell row": "Renegade Row"
};

export async function composeDailyPlan(
  dataSources: PlannerDataSources,
  inputs: PlannerInputs = {}
): Promise<DailyPlan> {
  const { supabase, userId } = dataSources;
  const { todayConstraints } = inputs;

  const today = toLocalDateString();
  const weekStartLocal = getWeekStartLocal(new Date());
  const [profileRes, workoutsRes, nutritionRes, progressRes, checkInsRes, weeklyPlanRes, progressionRes] = await Promise.all([
    supabase.from("user_profile").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("workout_logs")
      .select("date, workout_type, duration_minutes, exercises")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(14),
    supabase
      .from("nutrition_logs")
      .select("date, total_calories")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(14),
    supabase
      .from("progress_tracking")
      .select("date, weight")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(7),
    supabase
      .from("check_ins")
      .select("date_local, soreness_notes, energy_score, sleep_hours")
      .eq("user_id", userId)
      .eq("date_local", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("weekly_plans")
      .select("plan_json")
      .eq("user_id", userId)
      .eq("week_start_local", weekStartLocal)
      .maybeSingle(),
    supabase
      .from("progression_snapshots")
      .select("exercise_name, trend_score")
      .eq("user_id", userId)
  ]);

  const profile = (profileRes.data ?? {}) as Record<string, unknown>;
  const goals = Array.isArray(profile.goals)
    ? (profile.goals as string[]).map((g) => g.toLowerCase())
    : [];
  const injuries =
    typeof profile.injuries_limitations === "object" && profile.injuries_limitations
      ? JSON.stringify(profile.injuries_limitations).toLowerCase()
      : "";

  type WorkoutRow = {
    date: string;
    workout_type?: string;
    duration_minutes?: number;
    exercises?: Array<{ name?: string }>;
  };
  const workouts = (workoutsRes.data ?? []) as WorkoutRow[];
  const nutrition = (nutritionRes.data ?? []) as Array<{ total_calories?: number | null }>;
  const progress = (progressRes.data ?? []) as Array<{ weight?: number | null }>;
  const todayCheckIn = checkInsRes.data as { soreness_notes?: string | null; energy_score?: number | null; sleep_hours?: number | null } | null;
  const weeklyPlan = (weeklyPlanRes.data?.plan_json ?? null) as
    | {
      days?: Array<{
        date_local?: string;
        focus?: string;
        intensity?: "low" | "moderate" | "high";
        target_duration_minutes?: number;
      }>;
    }
    | null;
  const progressionData = (progressionRes.data ?? []) as Array<{ exercise_name?: string; trend_score?: number }>;

  const sorenessFromCheckIn = todayCheckIn?.soreness_notes?.trim() || undefined;
  const effectiveSoreness = todayConstraints?.soreness ?? sorenessFromCheckIn;
  const preferredTrainingDays = parsePreferredTrainingDays(profile);
  const todayWeekday = new Date(`${today}T00:00:00`).getDay();
  const isPreferredTrainingDay = preferredTrainingDays.includes(todayWeekday);
  const todayWeeklySlot = weeklyPlan?.days?.find((slot) => slot?.date_local === today);
  const weeklyIntensityTarget = todayWeeklySlot?.intensity ?? "moderate";

  const lastWorkoutDate = workouts[0]?.date ?? null;
  let daysSinceLastWorkout: number | null = null;
  if (lastWorkoutDate) {
    const diff =
      (new Date(today).setHours(0, 0, 0, 0) - new Date(lastWorkoutDate).setHours(0, 0, 0, 0)) /
      (24 * 60 * 60 * 1000);
    daysSinceLastWorkout = Math.floor(diff);
  }

  const recentExerciseNames = new Set<string>();
  for (const w of workouts.slice(0, 3)) {
    for (const e of w.exercises ?? []) {
      if (e.name?.trim()) recentExerciseNames.add(normalizeExerciseName(e.name));
    }
  }

  const avgCals = nutrition.length
    ? nutrition.reduce((sum, r) => sum + (Number(r.total_calories) || 0), 0) / nutrition.length
    : 0;

  const latestWeight = Number(progress[0]?.weight) || null;
  const previousWeight = Number(progress[1]?.weight) || null;
  const weightTrend =
    latestWeight != null && previousWeight != null
      ? latestWeight - previousWeight
      : 0;

  const workoutCount = workouts.length;
  const recentStrengthCount = workouts.filter((w) => w.workout_type === "strength").length;
  let minutesAvailable = clamp(
    todayConstraints?.minutesAvailable ?? todayWeeklySlot?.target_duration_minutes ?? 45,
    20,
    120
  );
  const location: "gym" | "home" = todayConstraints?.location ?? "gym";
  const experience = (profile.experience_level as string) || "intermediate";
  const motivation = (profile.motivational_driver as string) || "performance";

  let focus = "Full body strength";
  if (goals.some((g) => g.includes("weight") || g.includes("loss"))) {
    focus = "Fat-loss focused strength + conditioning";
  } else if (goals.some((g) => g.includes("endurance"))) {
    focus = "Cardio endurance and aerobic base";
  } else if (goals.some((g) => g.includes("mobility"))) {
    focus = "Mobility and movement quality";
  }

  // Refine focus based on motivation
  if (motivation === "health") focus = `Longevity: ${focus}`;
  if (motivation === "stress") focus = `Stress-relief: ${focus}`;
  if (motivation === "aesthetics") focus = `Physique: ${focus}`;

  if (todayWeeklySlot?.focus) {
    focus = todayWeeklySlot.focus;
  }
  if (!isPreferredTrainingDay && !todayConstraints?.minutesAvailable) {
    focus = "Recovery and movement quality";
    minutesAvailable = Math.min(minutesAvailable, 35);
  }

  const squatPool = location === "gym" ? SQUAT_POOL_GYM : SQUAT_POOL_HOME;
  const pushPool = location === "gym" ? PUSH_POOL_GYM : PUSH_POOL_HOME;
  const hingePool = location === "gym" ? HINGE_POOL_GYM : HINGE_POOL_HOME;
  const pullPool = location === "gym" ? PULL_POOL_GYM : PULL_POOL_HOME;

  function getPeriodizedAccessory(pool: string[], recentNormalized: Set<string>): { name: string; notes?: string } {
    for (const lift of pool) {
      const norm = normalizeExerciseName(lift);
      const snapshot = progressionData.find(p => p.exercise_name && normalizeExerciseName(p.exercise_name) === norm);
      if (snapshot && typeof snapshot.trend_score === "number" && snapshot.trend_score <= -0.02) {
        if (STICKING_POINT_ACCESSORIES[norm]) {
          return { name: STICKING_POINT_ACCESSORIES[norm], notes: `Periodized accessory for ${lift} sticking point.` };
        }
      }
    }
    return { name: pickFromPool(pool, recentNormalized) };
  }

  const squatSelection = getPeriodizedAccessory(squatPool, recentExerciseNames);
  const pushSelection = getPeriodizedAccessory(pushPool, recentExerciseNames);
  const hingeSelection = getPeriodizedAccessory(hingePool, recentExerciseNames);
  const pullSelection = getPeriodizedAccessory(pullPool, recentExerciseNames);

  // Experience-based intensity and rep ranges
  const baseRPE = experience === "beginner" ? "RPE 6" : experience === "advanced" ? "RPE 8" : "RPE 7";
  const mainReps = experience === "beginner" ? "10-12" : experience === "advanced" ? "3-5" : "6-8";
  const secondaryReps = experience === "beginner" ? "12-15" : experience === "advanced" ? "8-10" : "10-12";
  const mainSets = experience === "beginner" ? 3 : experience === "advanced" ? 5 : 4;
  const secondarySets = experience === "beginner" ? 2 : experience === "advanced" ? 4 : 3;

  const exercises: DailyPlanTrainingExercise[] =
    isRecoveryFocus(focus)
      ? [
        { name: pickFromPool(MOBILITY_POOL, recentExerciseNames), sets: 2, reps: "10", intensity: "Controlled" },
        { name: pickFromPool(MOBILITY_POOL.slice(1), recentExerciseNames), sets: 2, reps: "45s", intensity: "Moderate" },
        { name: "90/90 Hip Switches", sets: 2, reps: "8/side", intensity: "Controlled" },
        { name: "Cat-Cow", sets: 3, reps: "10", intensity: "Fluid" },
      ]
      : [
        { name: squatSelection.name, sets: mainSets, reps: mainReps, intensity: baseRPE, notes: squatSelection.notes },
        { name: pushSelection.name, sets: mainSets, reps: mainReps, intensity: baseRPE, notes: pushSelection.notes },
        { name: hingeSelection.name, sets: secondarySets, reps: secondaryReps, intensity: baseRPE, notes: hingeSelection.notes },
        { name: pullSelection.name, sets: secondarySets, reps: secondaryReps, intensity: baseRPE, notes: pullSelection.notes },
      ];

  // Dynamically add accessories if time allows (> 45 min)
  if (minutesAvailable > 45 && !isRecoveryFocus(focus)) {
    exercises.push({
      name: pickFromPool(ACCESSORY_POOL, recentExerciseNames),
      sets: 3,
      reps: "12-15",
      intensity: "RPE 8"
    });
    exercises.push({
      name: pickFromPool(ACCESSORY_POOL.slice(2), recentExerciseNames),
      sets: 3,
      reps: "12-15",
      intensity: "RPE 8"
    });
  }

  // Add HIIT/Finisher
  if (!isRecoveryFocus(focus) && (focus.includes("Fat-loss") || minutesAvailable > 40)) {
    exercises.push({
      name: pickFromPool(HIIT_POOL, recentExerciseNames),
      sets: 4,
      reps: "40s work / 20s rest",
      intensity: "High"
    });
  } else {
    exercises.push({
      name: "Zone 2 Finisher",
      sets: 1,
      reps: `${Math.max(8, Math.floor(minutesAvailable * 0.25))} min`,
      intensity: experience === "beginner" ? "Very Easy" : "Easy-moderate",
    });
  }

  const weightKg = Number(profile.weight) || 75;
  const energyScore = todayCheckIn?.energy_score ?? 7;
  const sleepHours = todayCheckIn?.sleep_hours ?? 7.5;

  // Metabolic Autopilot: Determine nutrition mode
  let nutritionMode: "Performance" | "Baseline" | "Recovery" = "Baseline";
  if (energyScore < 5 || sleepHours < 6 || isRecoveryFocus(focus)) {
    nutritionMode = "Recovery";
  } else if (energyScore >= 8 && sleepHours >= 8 && focus.includes("strength")) {
    nutritionMode = "Performance";
  }

  // Bio-Sync Readiness: Volume and Intensity adjustments
  let volumeMultiplier = 1.0;
  let intensityAdjustment = "";

  if (sleepHours < 6) {
    volumeMultiplier = 0.8;
    intensityAdjustment = " (Reduced volume for recovery)";
  } else if (sleepHours >= 8 && energyScore >= 8) {
    volumeMultiplier = 1.1; // Increase sets or reps slightly
  }
  if (weeklyIntensityTarget === "low") {
    volumeMultiplier *= 0.85;
    intensityAdjustment = `${intensityAdjustment} (Weekly low-intensity slot)`.trim();
  } else if (weeklyIntensityTarget === "high") {
    volumeMultiplier *= 1.05;
  }

  const protein = clamp(Math.round(weightKg * 1.8), 110, 220);
  const calorieTargetBase = goals.some((g) => g.includes("weight") || g.includes("loss"))
    ? Math.round((avgCals || 2200) - 300)
    : Math.round(avgCals || 2300);

  const calorieAdjustment = weightTrend > 0.3 ? -100 : weightTrend < -0.5 ? 100 : 0;

  // Apply Mode Adjustments
  let modeAdjustment = 0;
  if (nutritionMode === "Performance") modeAdjustment = 150;
  if (nutritionMode === "Recovery") modeAdjustment = -150;

  const calorieTarget = clamp(calorieTargetBase + calorieAdjustment + modeAdjustment, 1500, 3500);
  const fat = clamp(Math.round(weightKg * 0.8), 50, 110);

  // Carb cycling based on mode
  let carbMultiplier = 1.0;
  if (nutritionMode === "Performance") carbMultiplier = 1.2;
  if (nutritionMode === "Recovery") carbMultiplier = 0.8;

  const carbs = clamp(Math.round(((calorieTarget - protein * 4 - fat * 9) / 4) * carbMultiplier), 100, 450);

  // Apply Bio-Sync to exercises
  const adjustedExercises = exercises.map((exercise) =>
    normalizeGuidedExercise({
      ...exercise,
      sets: Math.max(1, Math.round(exercise.sets * volumeMultiplier)),
      notes: `${exercise.notes || ""}${intensityAdjustment}`.trim() || undefined,
    })
  );

  const safetyNotes = [
    "This coach is educational support, not medical diagnosis or treatment.",
    "If pain is sharp, radiating, or worsening, stop and seek licensed medical care.",
    "Keep 2-3 reps in reserve on main lifts unless technique is perfect.",
  ];

  if (sleepHours < 6) {
    safetyNotes.push(`Low sleep detected (${sleepHours}h). Focus on technique and movement quality over maximum load today.`);
  }
  if (injuries.includes("knee")) {
    safetyNotes.push("Prioritize pain-free knee range and consider split squat or box squat regressions.");
  }
  if (injuries.includes("back") || injuries.includes("spine")) {
    safetyNotes.push("Use neutral-spine variations and reduce axial loading today.");
  }
  if (effectiveSoreness) {
    safetyNotes.push(`Reported soreness: ${effectiveSoreness}. Reduce loads by 5-10% if needed.`);
  }

  const alternatives = [
    "If short on time, complete first 3 exercises only.",
    "If equipment is limited, swap to bodyweight variants and keep tempo slow.",
    workoutCount < 2 || recentStrengthCount === 0
      ? "Prioritize movement quality over load this week to build consistency."
      : "If all sets felt easy, add 2.5-5 lb next session.",
  ];

  if (daysSinceLastWorkout != null && daysSinceLastWorkout >= 2) {
    alternatives.push("Returning after a break—consider 10% lighter on the first set to re-acclimate.");
  }
  if (daysSinceLastWorkout === 0) {
    alternatives.push("You already logged a workout today; use this plan as a second session or save for tomorrow.");
  }

  return {
    date_local: toLocalDateString(),
    training_plan: {
      focus,
      duration_minutes: minutesAvailable,
      location_option: location,
      exercises: adjustedExercises,
      alternatives,
    },
    nutrition_plan: {
      calorie_target: calorieTarget,
      nutrition_mode: nutritionMode,
      macros: {
        protein_g: protein,
        carbs_g: carbs,
        fat_g: fat,
      },
      meal_structure: [
        "Meal 1: protein + fruit + complex carb",
        "Meal 2: lean protein + vegetables + starch",
        "Meal 3: protein + vegetables + healthy fat",
        "Snack: high-protein option if needed",
      ],
      hydration_goal_liters: 2.5,
    },
    safety_notes: safetyNotes,
  };
}
