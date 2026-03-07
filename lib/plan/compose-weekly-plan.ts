import { toLocalDateString } from "@/lib/date/local-date";
import type { PlannerDataSources, WeeklyPlan, WeeklyPlanDay, WeeklyPlanExercise } from "@/lib/plan/types";
import type { EquipmentProfile, EquipmentTag, GymAccessLevel } from "@/lib/plan/equipment";
import { describeEquipmentForAI, EQUIPMENT_PRESETS } from "@/lib/plan/equipment";

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

function localWeekday(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

/** Read equipment profile from user_profile.devices.equipment */
function parseEquipmentProfile(profile: Record<string, unknown>): EquipmentProfile {
  const devices = (profile.devices ?? {}) as Record<string, unknown>;
  const eq = (devices.equipment ?? {}) as Record<string, unknown>;
  const gymAccess = (eq.gym_access as GymAccessLevel) ?? "full_gym";
  const available = Array.isArray(eq.available_equipment)
    ? (eq.available_equipment as EquipmentTag[])
    : EQUIPMENT_PRESETS[gymAccess]?.equipment ?? EQUIPMENT_PRESETS.full_gym.equipment;
  return {
    gym_access: gymAccess,
    available_equipment: available,
    notes: typeof eq.notes === "string" ? eq.notes : undefined,
  };
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

const has = (equipment: EquipmentTag[], tag: EquipmentTag) => equipment.includes(tag);

// ---------------------------------------------------------------------------
// Exercise Library — equipment-aware selections used by the plan composer
// ---------------------------------------------------------------------------

type ExerciseEntry = {
  name: string;
  equipment: EquipmentTag;
  sets: number;
  reps: string;
  coaching_cue: string;
  needs?: EquipmentTag[]; // all tags required; defaults to [equipment]
};

const EXERCISE_LIBRARY: {
  upper_push: ExerciseEntry[];
  upper_pull: ExerciseEntry[];
  lower_push: ExerciseEntry[];
  lower_pull: ExerciseEntry[];
  core: ExerciseEntry[];
  cardio: ExerciseEntry[];
  mobility: ExerciseEntry[];
  full_body: ExerciseEntry[];
} = {
  upper_push: [
    { name: "Barbell Bench Press", equipment: "barbell", sets: 4, reps: "5–8", coaching_cue: "Retract shoulder blades, drive through your full foot.", needs: ["barbell", "bench_press"] },
    { name: "Incline Dumbbell Press", equipment: "dumbbells", sets: 3, reps: "8–12", coaching_cue: "Control the descent, elbows at 45°." },
    { name: "Cable Chest Fly (high to low)", equipment: "cable_machine", sets: 3, reps: "12–15", coaching_cue: "Lead with your pinky, squeeze at centre." },
    { name: "Smith Machine Shoulder Press", equipment: "smith_machine", sets: 3, reps: "10–12", coaching_cue: "Keep core braced, press straight up." },
    { name: "Dumbbell Lateral Raise", equipment: "dumbbells", sets: 3, reps: "15–20", coaching_cue: "Slight forward lean, pinkies up at top." },
    { name: "Dumbbell Overhead Press", equipment: "dumbbells", sets: 4, reps: "8–12", coaching_cue: "Squeeze glutes for a stable base." },
    { name: "Resistance Band Chest Press", equipment: "resistance_bands", sets: 3, reps: "15–20", coaching_cue: "Anchor band at chest height, press forward." },
    { name: "Push-Up (weighted or banded)", equipment: "bodyweight_only", sets: 3, reps: "12–20", coaching_cue: "Full plank position — no hip sag." },
    { name: "Dip", equipment: "dip_bars", sets: 3, reps: "8–12", coaching_cue: "Slight forward lean for chest emphasis." },
  ],
  upper_pull: [
    { name: "Barbell Row (Bent-Over)", equipment: "barbell", sets: 4, reps: "6–10", coaching_cue: "Hip hinge at 45°, pull to lower chest." },
    { name: "Lat Pulldown (Wide Grip)", equipment: "lat_pulldown", sets: 4, reps: "10–12", coaching_cue: "Drive elbows down to hips, chest up." },
    { name: "Cable Row (Seated, narrow grip)", equipment: "cable_machine", sets: 3, reps: "12–15", coaching_cue: "Full stretch at top, no lumbar rounding." },
    { name: "Dumbbell Single-Arm Row", equipment: "dumbbells", sets: 3, reps: "10–12", coaching_cue: "Row to hip crease, not armpit." },
    { name: "Pull-Up (bodyweight or assisted)", equipment: "pull_up_bar", sets: 4, reps: "AMRAP", coaching_cue: "Start from a dead hang, chin clears bar." },
    { name: "Face Pull (cable, rope attachment)", equipment: "cable_machine", sets: 3, reps: "15–20", coaching_cue: "Pull to forehead, externally rotate at end." },
    { name: "Resistance Band Pull-Apart", equipment: "resistance_bands", sets: 3, reps: "20–25", coaching_cue: "Straight arms, slow and controlled." },
    { name: "TRX Row", equipment: "trx_suspension", sets: 3, reps: "12–15", coaching_cue: "Body rigid — harder = more horizontal body angle." },
    { name: "Kettlebell Renegade Row", equipment: "kettlebells", sets: 3, reps: "8–10 each", coaching_cue: "Hips square, no rotation, core locked." },
  ],
  lower_push: [
    { name: "Back Squat (Barbell)", equipment: "barbell", sets: 4, reps: "5–8", coaching_cue: "Break at hips and knees together, chest tall.", needs: ["barbell", "squat_rack"] },
    { name: "Front Squat", equipment: "barbell", sets: 3, reps: "5–8", coaching_cue: "Elbows high, thoracic extension key.", needs: ["barbell", "squat_rack"] },
    { name: "Leg Press (feet high & wide)", equipment: "leg_press", sets: 4, reps: "10–15", coaching_cue: "Never lock knees out, full range." },
    { name: "Bulgarian Split Squat (Dumbbells)", equipment: "dumbbells", sets: 3, reps: "8–10 each", coaching_cue: "Trunk upright, knee tracks over toe." },
    { name: "Goblet Squat (Kettlebell)", equipment: "kettlebells", sets: 3, reps: "12–15", coaching_cue: "Heels grounded, chest up." },
    { name: "Walking Lunge (Dumbbells)", equipment: "dumbbells", sets: 3, reps: "10–12 each", coaching_cue: "Long stride, shin vertical on front leg." },
    { name: "Jump Squat (Bodyweight)", equipment: "bodyweight_only", sets: 3, reps: "10–12", coaching_cue: "Land softly with bent knees." },
    { name: "Step-Up (Plyo Box, Dumbbells)", equipment: "dumbbells", sets: 3, reps: "10 each", coaching_cue: "Drive through the front heel.", needs: ["dumbbells", "plyo_box"] },
  ],
  lower_pull: [
    { name: "Conventional Deadlift", equipment: "barbell", sets: 4, reps: "4–6", coaching_cue: "Bar over mid-foot, hinge don't squat.", needs: ["barbell", "power_rack"] },
    { name: "Romanian Deadlift (Dumbbells)", equipment: "dumbbells", sets: 3, reps: "10–12", coaching_cue: "Soft knee, hinge until you feel hamstring tension." },
    { name: "Lying Leg Curl Machine", equipment: "leg_curl", sets: 3, reps: "12–15", coaching_cue: "Squeeze at top, slow eccentric." },
    { name: "Stiff-Leg Deadlift (Barbell)", equipment: "barbell", sets: 3, reps: "8–10", coaching_cue: "Slight knee bend, bar stays close." },
    { name: "Glute Bridge (Barbell)", equipment: "barbell", sets: 3, reps: "10–12", coaching_cue: "Drive through heels, full hip extension at top." },
    { name: "Hip Thrust (Dumbbell)", equipment: "dumbbells", sets: 3, reps: "12–15", coaching_cue: "Upper back on bench, chin tucked." },
    { name: "Kettlebell Swing", equipment: "kettlebells", sets: 4, reps: "15–20", coaching_cue: "Hinge—not squat. Power from hips." },
    { name: "Nordic Hamstring Curl (Bodyweight)", equipment: "bodyweight_only", sets: 3, reps: "4–6 slow", coaching_cue: "Lower under control; eccentric-only is fine." },
  ],
  core: [
    { name: "Hanging Leg Raise", equipment: "pull_up_bar", sets: 3, reps: "10–15", coaching_cue: "No swing — posterior pelvic tilt at top." },
    { name: "Cable Crunch", equipment: "cable_machine", sets: 3, reps: "15–20", coaching_cue: "Curl rib to hip, not head to knees." },
    { name: "Ab Wheel Rollout", equipment: "ab_wheel", sets: 3, reps: "8–12", coaching_cue: "Extend to full hollow, pull from lats." },
    { name: "Plank (weighted)", equipment: "bodyweight_only", sets: 3, reps: "30–60 sec", coaching_cue: "Anterior pelvic tilt, ribs down." },
    { name: "Dead Bug", equipment: "bodyweight_only", sets: 3, reps: "8–10 each", coaching_cue: "Low back glued to floor throughout." },
    { name: "Pallof Press (Cable)", equipment: "cable_machine", sets: 3, reps: "10–12 each", coaching_cue: "Resist rotation — this is an anti-rotation drill." },
    { name: "Medicine Ball Slam", equipment: "medicine_ball", sets: 3, reps: "10–15", coaching_cue: "Full overhead extension before slam." },
  ],
  cardio: [
    { name: "Rowing Machine Intervals (20s on / 10s rest)", equipment: "rowing_machine", sets: 8, reps: "Tabata", coaching_cue: "Drive legs first — arms finish the stroke." },
    { name: "Assault Bike (calorie target)", equipment: "assault_bike", sets: 5, reps: "15 cal each", coaching_cue: "Push AND pull the handles." },
    { name: "Treadmill Hill Intervals (incline 8–12%)", equipment: "treadmill", sets: 6, reps: "2 min / 1 min rest", coaching_cue: "Upright posture, don't lean on rails." },
    { name: "Jump Rope (double-unders)", equipment: "jump_rope", sets: 5, reps: "30 sec on / 15 off", coaching_cue: "Small wrist circles, jump on balls of feet." },
    { name: "Battle Rope Waves", equipment: "battle_ropes", sets: 5, reps: "20 sec on / 10 sec rest", coaching_cue: "Stay in athletic stance — hips drive the power." },
    { name: "Bike Erg Sprint (30 sec max effort)", equipment: "stationary_bike", sets: 6, reps: "30s / 90s recovery", coaching_cue: "Max cadence — go all out." },
    { name: "Burpee (Bodyweight)", equipment: "bodyweight_only", sets: 4, reps: "10–15", coaching_cue: "Chest to floor, explosive jump at top." },
  ],
  mobility: [
    { name: "Foam Roll (thoracic spine)", equipment: "foam_roller", sets: 1, reps: "60 sec each segment", coaching_cue: "Pause on tender spots, breathe deeply." },
    { name: "Hip 90/90 Stretch", equipment: "bodyweight_only", sets: 2, reps: "60 sec each", coaching_cue: "Tall spine, hold external rotation position." },
    { name: "World's Greatest Stretch", equipment: "bodyweight_only", sets: 2, reps: "6–8 each", coaching_cue: "Elbow to floor, rotate smoothly." },
    { name: "Band Shoulder Distraction", equipment: "resistance_bands", sets: 2, reps: "60 sec each", coaching_cue: "Allow passive stretch, don't force." },
    { name: "Cat-Cow (Breathing pattern)", equipment: "bodyweight_only", sets: 2, reps: "10 breath cycles", coaching_cue: "Inhale to extend, exhale to flex." },
    { name: "Couch Stretch (Hip Flexor)", equipment: "bodyweight_only", sets: 2, reps: "90 sec each", coaching_cue: "Posterior pelvic tilt, squeeze glute of rear leg." },
    { name: "Downward Dog ↔ Pigeon flow", equipment: "bodyweight_only", sets: 2, reps: "5 each", coaching_cue: "Controlled breath through each transition." },
  ],
  full_body: [
    { name: "Barbell Complex (DL + Row + Clean + Press)", equipment: "barbell", sets: 4, reps: "5 each", coaching_cue: "No rest between movements; light-moderate load." },
    { name: "Dumbbell Thrusters", equipment: "dumbbells", sets: 4, reps: "10–12", coaching_cue: "Front squat to overhead press — fluid transition." },
    { name: "Kettlebell Turkish Get-Up", equipment: "kettlebells", sets: 3, reps: "3–5 each", coaching_cue: "Move slow, every joint position intentional." },
    { name: "TRX Squat + Row Combo", equipment: "trx_suspension", sets: 3, reps: "10–12", coaching_cue: "Squat into row at bottom, extend at top." },
    { name: "Band Pull-Apart + Press superset", equipment: "resistance_bands", sets: 3, reps: "15/15", coaching_cue: "Shoulders packed throughout." },
    { name: "Deadball Squat + Slam", equipment: "medicine_ball", sets: 3, reps: "10", coaching_cue: "Full squat to pick up, explode overhead." },
    { name: "Bodyweight Flow (Squat → Lunge → Push-Up)", equipment: "bodyweight_only", sets: 3, reps: "8 cycles", coaching_cue: "Continuous movement, no pauses." },
  ],
};

/**
 * Pick the best exercises from a category that match available equipment.
 * Prefers variety — tries to use different equipment tags across the session.
 */
function selectExercises(
  category: keyof typeof EXERCISE_LIBRARY,
  equipment: EquipmentTag[],
  count: number,
  usedEquipment: Set<string> = new Set()
): WeeklyPlanExercise[] {
  const pool = EXERCISE_LIBRARY[category];
  const available = pool.filter((ex) => {
    const required = ex.needs ?? [ex.equipment];
    return required.every((tag) => equipment.includes(tag));
  });

  if (available.length === 0) {
    // Fallback to bodyweight
    const bw = pool.filter((ex) => ex.equipment === "bodyweight_only");
    return bw.slice(0, count).map((ex) => ({
      name: ex.name,
      equipment: "Bodyweight",
      sets: ex.sets,
      reps: ex.reps,
      coaching_cue: ex.coaching_cue,
    }));
  }

  // Prefer exercises using equipment not yet used this session for variety
  const scored = available
    .map((ex) => ({
      ex,
      novelty: usedEquipment.has(ex.equipment) ? 0 : 1,
    }))
    .sort((a, b) => b.novelty - a.novelty);

  return scored.slice(0, count).map(({ ex }) => {
    usedEquipment.add(ex.equipment);
    return {
      name: ex.name,
      equipment: String(ex.equipment).replace(/_/g, " "),
      sets: ex.sets,
      reps: ex.reps,
      coaching_cue: ex.coaching_cue,
    };
  });
}

/**
 * Build a rich exercise list for each day focus, respecting equipment constraints.
 */
function buildExercisesForFocus(
  focus: string,
  intensity: "low" | "moderate" | "high",
  goals: string[],
  equipment: EquipmentTag[]
): { exercises: WeeklyPlanExercise[]; equipment_context: string } {
  const usedEquipment = new Set<string>();
  const exercises: WeeklyPlanExercise[] = [];
  const f = focus.toLowerCase();
  const g = goals.map((g) => g.toLowerCase());

  if (intensity === "low" || f.includes("recovery") || f.includes("mobility")) {
    exercises.push(...selectExercises("mobility", equipment, 4, usedEquipment));
    exercises.push(...selectExercises("core", equipment, 2, usedEquipment));
    if (!f.includes("mobility")) {
      exercises.push(...selectExercises("cardio", equipment, 1, usedEquipment));
    }
  } else if (f.includes("upper") && f.includes("push") || f.includes("push")) {
    exercises.push(...selectExercises("upper_push", equipment, 5, usedEquipment));
    exercises.push(...selectExercises("core", equipment, 2, usedEquipment));
  } else if (f.includes("upper") && f.includes("pull") || f.includes("pull") && !f.includes("lower")) {
    exercises.push(...selectExercises("upper_pull", equipment, 5, usedEquipment));
    exercises.push(...selectExercises("core", equipment, 2, usedEquipment));
  } else if (f.includes("lower") && f.includes("push") || f.includes("squat") || f.includes("leg")) {
    exercises.push(...selectExercises("lower_push", equipment, 4, usedEquipment));
    exercises.push(...selectExercises("lower_pull", equipment, 2, usedEquipment));
    exercises.push(...selectExercises("core", equipment, 1, usedEquipment));
  } else if (f.includes("lower") || f.includes("hamstring") || f.includes("posterior")) {
    exercises.push(...selectExercises("lower_pull", equipment, 4, usedEquipment));
    exercises.push(...selectExercises("lower_push", equipment, 2, usedEquipment));
    exercises.push(...selectExercises("core", equipment, 1, usedEquipment));
  } else if (f.includes("upper") || f.includes("strength")) {
    // Full upper: push + pull split
    const pushCount = g.some((x) => x.includes("muscle")) ? 3 : 2;
    const pullCount = g.some((x) => x.includes("muscle")) ? 3 : 2;
    exercises.push(...selectExercises("upper_push", equipment, pushCount, usedEquipment));
    exercises.push(...selectExercises("upper_pull", equipment, pullCount, usedEquipment));
    exercises.push(...selectExercises("core", equipment, 2, usedEquipment));
  } else if (f.includes("conditioning") || f.includes("cardio") || f.includes("interval") || f.includes("aerobic")) {
    exercises.push(...selectExercises("cardio", equipment, 4, usedEquipment));
    exercises.push(...selectExercises("core", equipment, 2, usedEquipment));
  } else if (f.includes("full body") || f.includes("hybrid")) {
    exercises.push(...selectExercises("full_body", equipment, 3, usedEquipment));
    exercises.push(...selectExercises("core", equipment, 2, usedEquipment));
    exercises.push(...selectExercises("cardio", equipment, 1, usedEquipment));
  } else {
    // Generic fallback — balanced
    exercises.push(...selectExercises("upper_push", equipment, 2, usedEquipment));
    exercises.push(...selectExercises("upper_pull", equipment, 2, usedEquipment));
    exercises.push(...selectExercises("lower_push", equipment, 2, usedEquipment));
    exercises.push(...selectExercises("core", equipment, 1, usedEquipment));
  }

  const uniqueEquipment = Array.from(new Set(exercises.map((e) => e.equipment)))
    .filter((e) => e.toLowerCase() !== "bodyweight_only")
    .map((e) => e.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" "));

  return {
    exercises,
    equipment_context: uniqueEquipment.length > 0 ? uniqueEquipment.join(", ") : "Bodyweight",
  };
}

type CycleSlot = { focus: string; intensity: "low" | "moderate" | "high"; minutes: number };

function pickCycleTemplate(goals: string[], equip: EquipmentProfile): CycleSlot[] {
  const normalized = goals.map((g) => g.toLowerCase());
  const hasBarbell = has(equip.available_equipment, "barbell");

  if (normalized.some((g) => g.includes("endurance"))) {
    return [
      { focus: "Aerobic base + mobility", intensity: "moderate", minutes: 45 },
      { focus: "Upper strength", intensity: "moderate", minutes: 40 },
      { focus: "Conditioning cardio intervals", intensity: "high", minutes: 35 },
      { focus: "Recovery + mobility flow", intensity: "low", minutes: 30 },
      { focus: "Lower body strength", intensity: "high", minutes: 45 },
      { focus: "Hybrid conditioning", intensity: "moderate", minutes: 45 },
      { focus: "Full recovery", intensity: "low", minutes: 25 },
    ];
  }

  if (normalized.some((g) => g.includes("muscle"))) {
    return hasBarbell ? [
      { focus: "Upper push (barbell-focused)", intensity: "high", minutes: 60 },
      { focus: "Lower push (squat pattern)", intensity: "high", minutes: 60 },
      { focus: "Active recovery + mobility flow", intensity: "low", minutes: 30 },
      { focus: "Upper pull (posterior chain)", intensity: "moderate", minutes: 55 },
      { focus: "Lower pull (hinge pattern)", intensity: "high", minutes: 55 },
      { focus: "Upper hypertrophy (volume)", intensity: "moderate", minutes: 50 },
      { focus: "Full recovery", intensity: "low", minutes: 25 },
    ] : [
      { focus: "Upper push (dumbbell-focused)", intensity: "high", minutes: 55 },
      { focus: "Lower push (lunge + squat patterns)", intensity: "high", minutes: 55 },
      { focus: "Active recovery + mobility flow", intensity: "low", minutes: 30 },
      { focus: "Upper pull (cable + dumbbell)", intensity: "moderate", minutes: 50 },
      { focus: "Lower pull (hinge + glute pattern)", intensity: "moderate", minutes: 50 },
      { focus: "Full body accessory hypertrophy", intensity: "moderate", minutes: 50 },
      { focus: "Full recovery", intensity: "low", minutes: 25 },
    ];
  }

  if (normalized.some((g) => g.includes("mobility"))) {
    return [
      { focus: "Mobility flow + flexibility", intensity: "low", minutes: 35 },
      { focus: "Full body technique + stability", intensity: "moderate", minutes: 40 },
      { focus: "Mobility + core integration", intensity: "low", minutes: 35 },
      { focus: "Strength quality (light load, full ROM)", intensity: "moderate", minutes: 45 },
      { focus: "Mobility + aerobic cardio", intensity: "moderate", minutes: 40 },
      { focus: "Movement quality + posterior chain", intensity: "low", minutes: 35 },
      { focus: "Full recovery", intensity: "low", minutes: 25 },
    ];
  }

  // Default / weight loss / general fitness
  return [
    { focus: "Full body strength (compound movements)", intensity: "high", minutes: 50 },
    { focus: "Conditioning cardio intervals", intensity: "moderate", minutes: 40 },
    { focus: "Lower body strength + core", intensity: "high", minutes: 50 },
    { focus: "Recovery + mobility flow", intensity: "low", minutes: 30 },
    { focus: "Upper body strength (push + pull)", intensity: "moderate", minutes: 45 },
    { focus: "Hybrid conditioning", intensity: "moderate", minutes: 40 },
    { focus: "Full recovery", intensity: "low", minutes: 25 },
  ];
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
  const equipmentProfile = parseEquipmentProfile(profile);
  const equipment = equipmentProfile.available_equipment;

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

  const template = pickCycleTemplate(goals, equipmentProfile);
  const days: WeeklyPlanDay[] = [];

  for (let i = 0; i < 7; i += 1) {
    const slotDate = addDays(weekStartDate, i);
    const slotDateLocal = toLocalDateString(slotDate);
    const slotWeekday = slotDate.getDay();
    const base = template[i];
    const isPreferredDay = preferredTrainingDays.includes(slotWeekday);

    let intensity = base.intensity;
    let duration = base.minutes;
    let focus = base.focus;

    if (!isPreferredDay) {
      intensity = "low";
      duration = Math.min(30, base.minutes);
      focus = "Recovery and movement quality";
    }

    if (avgSleep < 6.5 || lowEnergyDays >= 3 || sorenessFlags >= 3) {
      if (intensity === "high") intensity = "moderate";
      else if (intensity === "moderate") intensity = "low";
      duration = Math.max(25, Math.round(duration * 0.85));
    }

    const { exercises, equipment_context } = buildExercisesForFocus(focus, intensity, goals, equipment);

    const rationaleParts = [
      isPreferredDay ? "Aligned with your preferred training schedule" : "Rest day — lighter session to aid recovery",
      avgSleep < 6.5 ? `Average sleep (${avgSleep.toFixed(1)}h) is below target — intensity reduced` : "Sleep trend supports the planned workload",
      sorenessFlags >= 2 ? "Soreness noted — volume conserved" : "Recovery signals nominal",
      `Equipment: ${equipment_context}`,
    ];

    days.push({
      date_local: slotDateLocal,
      day_label: localWeekday(slotDate),
      focus,
      intensity,
      target_duration_minutes: duration,
      rationale: rationaleParts.join(". "),
      equipment_context,
      exercises,
    });
  }

  const weeklyWorkoutCount = workouts.filter((entry) => entry.date >= weekStart).length;
  const cycleGoal = goals.length > 0 ? goals.join(", ") : "General fitness and consistency";
  const equipSummary = describeEquipmentForAI(equipmentProfile);
  const adaptationSummary = `Planned ${days.filter((d) => d.intensity !== "low").length} training-focused sessions this week. Equipment: ${equipmentProfile.gym_access.replace(/_/g, " ")}. Recent completed sessions this week: ${weeklyWorkoutCount}. Sleep, soreness, and energy signals are used to downshift high-intensity days when recovery is limited.\n\n${equipSummary}`;

  return {
    week_start_local: weekStart,
    cycle_goal: cycleGoal,
    adaptation_summary: adaptationSummary,
    days,
  };
}
