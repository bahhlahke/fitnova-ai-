import { toLocalDateString } from "@/lib/date/local-date";
import type { DailyPlan, DailyPlanTrainingExercise, PlannerDataSources, PlannerInputs } from "@/lib/plan/types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeExerciseName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

/** Exercise pools per movement slot; [0] is preferred when not recently done. */
const SQUAT_POOL_GYM = ["Back Squat", "Goblet Squat", "Leg Press", "Front Squat"];
const SQUAT_POOL_HOME = ["Dumbbell Goblet Squat", "Goblet Squat", "Bodyweight Squat"];
const PUSH_POOL_GYM = ["Bench Press", "Incline Dumbbell Press", "Push-up"];
const PUSH_POOL_HOME = ["Push-up", "Incline Push-up", "Dumbbell Press"];
const HINGE_POOL_GYM = ["Romanian Deadlift", "Dumbbell RDL", "Deadlift"];
const HINGE_POOL_HOME = ["Dumbbell RDL", "Romanian Deadlift", "Kettlebell Swing"];
const PULL_POOL_GYM = ["Seated Row", "Dumbbell Row", "Lat Pulldown", "Barbell Row"];
const PULL_POOL_HOME = ["Single-arm Row", "Dumbbell Row", "Inverted Row"];

function pickFromPool(pool: string[], recentNormalized: Set<string>): string {
  for (const name of pool) {
    if (!recentNormalized.has(normalizeExerciseName(name))) return name;
  }
  return pool[0];
}

export async function composeDailyPlan(
  dataSources: PlannerDataSources,
  inputs: PlannerInputs = {}
): Promise<DailyPlan> {
  const { supabase, userId } = dataSources;
  const { todayConstraints } = inputs;

  const [profileRes, workoutsRes, nutritionRes, progressRes] = await Promise.all([
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

  const today = toLocalDateString();
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
  const minutesAvailable = clamp(todayConstraints?.minutesAvailable ?? 45, 20, 120);
  const location: "gym" | "home" = todayConstraints?.location ?? "gym";

  let focus = "Full body strength";
  if (goals.some((g) => g.includes("weight") || g.includes("loss"))) {
    focus = "Fat-loss focused strength + conditioning";
  } else if (goals.some((g) => g.includes("endurance"))) {
    focus = "Cardio endurance and aerobic base";
  } else if (goals.some((g) => g.includes("mobility"))) {
    focus = "Mobility and movement quality";
  }

  const squatPool = location === "gym" ? SQUAT_POOL_GYM : SQUAT_POOL_HOME;
  const pushPool = location === "gym" ? PUSH_POOL_GYM : PUSH_POOL_HOME;
  const hingePool = location === "gym" ? HINGE_POOL_GYM : HINGE_POOL_HOME;
  const pullPool = location === "gym" ? PULL_POOL_GYM : PULL_POOL_HOME;

  const exercises: DailyPlanTrainingExercise[] =
    focus.includes("Mobility")
      ? [
          { name: "World's Greatest Stretch", sets: 2, reps: "6/side", intensity: "Controlled", notes: "Move slowly." },
          { name: "Couch Stretch", sets: 2, reps: "45s/side", intensity: "Moderate" },
          { name: "Goblet Squat", sets: 3, reps: "10", intensity: "RPE 6-7" },
          { name: "Dead Bug", sets: 3, reps: "8/side", intensity: "Controlled" },
        ]
      : [
          { name: pickFromPool(squatPool, recentExerciseNames), sets: 4, reps: "6-8", intensity: "RPE 7" },
          { name: pickFromPool(pushPool, recentExerciseNames), sets: 4, reps: "6-10", intensity: "RPE 7" },
          { name: pickFromPool(hingePool, recentExerciseNames), sets: 3, reps: "8-10", intensity: "RPE 7" },
          { name: pickFromPool(pullPool, recentExerciseNames), sets: 3, reps: "10-12", intensity: "RPE 7" },
          {
            name: "Zone 2 Finisher",
            sets: 1,
            reps: `${Math.max(8, Math.floor(minutesAvailable * 0.25))} min`,
            intensity: "Easy-moderate",
          },
        ];

  const weightKg = Number(profile.weight) || 75;
  const protein = clamp(Math.round(weightKg * 1.8), 110, 220);
  const calorieTargetBase = goals.some((g) => g.includes("weight") || g.includes("loss"))
    ? Math.round((avgCals || 2200) - 300)
    : Math.round(avgCals || 2300);
  const calorieAdjustment = weightTrend > 0.3 ? -100 : weightTrend < -0.5 ? 100 : 0;
  const calorieTarget = clamp(calorieTargetBase + calorieAdjustment, 1500, 3500);
  const fat = clamp(Math.round(weightKg * 0.8), 50, 110);
  const carbs = clamp(Math.round((calorieTarget - protein * 4 - fat * 9) / 4), 100, 450);

  const safetyNotes = [
    "This coach is educational support, not medical diagnosis or treatment.",
    "If pain is sharp, radiating, or worsening, stop and seek licensed medical care.",
    "Keep 2-3 reps in reserve on main lifts unless technique is perfect.",
  ];

  if (injuries.includes("knee")) {
    safetyNotes.push("Prioritize pain-free knee range and consider split squat or box squat regressions.");
  }
  if (injuries.includes("back") || injuries.includes("spine")) {
    safetyNotes.push("Use neutral-spine variations and reduce axial loading today.");
  }
  if (todayConstraints?.soreness) {
    safetyNotes.push(`Reported soreness: ${todayConstraints.soreness}. Reduce loads by 5-10% if needed.`);
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
      exercises,
      alternatives,
    },
    nutrition_plan: {
      calorie_target: calorieTarget,
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
