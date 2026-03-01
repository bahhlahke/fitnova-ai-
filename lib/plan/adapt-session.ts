import type {
  AdaptSessionRequest,
  AdaptSessionResponse,
  DailyPlanTrainingExercise,
} from "@/lib/plan/types";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function includesAny(text: string, tokens: string[]): boolean {
  const lower = text.toLowerCase();
  return tokens.some((token) => lower.includes(token.toLowerCase()));
}

function isExcludedByRegion(exercise: DailyPlanTrainingExercise, avoid: string[]): boolean {
  const name = exercise.name.toLowerCase();
  if (avoid.some((region) => region.toLowerCase().includes("knee"))) {
    if (/squat|lunge|step-up|leg press/.test(name)) return true;
  }
  if (avoid.some((region) => region.toLowerCase().includes("back") || region.toLowerCase().includes("spine"))) {
    if (/deadlift|rdl|good morning|barbell row/.test(name)) return true;
  }
  if (avoid.some((region) => region.toLowerCase().includes("shoulder"))) {
    if (/press|push-up|overhead/.test(name)) return true;
  }
  return false;
}

function safeReplacement(name: string, equipmentMode: AdaptSessionRequest["equipment_mode"]): string {
  const lower = name.toLowerCase();

  if (/squat|lunge|leg press/.test(lower)) {
    return equipmentMode === "bodyweight" ? "Bodyweight Box Squat" : "Goblet Squat";
  }
  if (/deadlift|rdl|hinge/.test(lower)) {
    return equipmentMode === "bodyweight" ? "Hip Hinge Drill" : "Dumbbell Romanian Deadlift";
  }
  if (/press|push/.test(lower)) {
    return equipmentMode === "bodyweight" ? "Incline Push-up" : "Dumbbell Floor Press";
  }
  if (/row|pull/.test(lower)) {
    return equipmentMode === "bodyweight" ? "Inverted Row" : "Single-arm Dumbbell Row";
  }

  return equipmentMode === "bodyweight" ? "Bodyweight Circuit" : "Tempo Bodyweight Variation";
}

export function adaptSession(input: AdaptSessionRequest): AdaptSessionResponse {
  const source = Array.isArray(input.current_exercises) ? input.current_exercises : [];
  const equipmentMode = input.equipment_mode ?? "full_gym";
  const avoid = (input.avoid_body_regions ?? []).filter(Boolean);
  const painFlags = (input.pain_flags ?? []).filter(Boolean);
  const downshift = input.intensity_preference === "downshift";
  const push = input.intensity_preference === "push";

  const next: DailyPlanTrainingExercise[] = [];

  for (const exercise of source) {
    const shouldSwap =
      isExcludedByRegion(exercise, avoid) ||
      (painFlags.length > 0 && includesAny(exercise.name, painFlags));

    const baseSets = clamp(Number(exercise.sets) || 1, 1, 8);
    const multiplier = downshift ? 0.8 : push ? 1.1 : 1;
    const sets = clamp(Math.round(baseSets * multiplier), 1, 8);

    if (shouldSwap) {
      next.push({
        ...exercise,
        name: safeReplacement(exercise.name, equipmentMode),
        sets,
        intensity: downshift ? "RPE 5-6" : exercise.intensity,
        notes: "Adapted for safety constraints and session continuity.",
      });
      continue;
    }

    next.push({
      ...exercise,
      sets,
      intensity: downshift ? "RPE 6" : push ? "RPE 8" : exercise.intensity,
      notes: downshift
        ? "Downshifted for recovery constraints."
        : push
          ? "Slight progression push requested."
          : exercise.notes,
    });
  }

  const maxMinutes = clamp(input.minutes_available ?? 45, 10, 120);
  const estimatedMinutes = next.reduce((sum, ex) => sum + Math.max(4, ex.sets * 2), 0);
  const trimmed = estimatedMinutes > maxMinutes ? next.slice(0, Math.max(1, Math.floor((maxMinutes / estimatedMinutes) * next.length))) : next;

  return {
    exercises: trimmed,
    rationale:
      trimmed.length < next.length
        ? "Session shortened to fit available time while preserving core stimulus."
        : "Session adapted using constraints for equipment, body-region avoidance, and intensity preference.",
    reliability: {
      confidence_score: 0.79,
      explanation: "Rule-based adaptation with deterministic safety substitutions.",
      limitations: [
        "No live pain telemetry is available; stop if symptoms worsen.",
        "Load prescriptions still require user judgement and warm-up feedback.",
      ],
    },
  };
}
