import type { DailyPlan, DailyPlanTrainingExercise } from "@/lib/plan/types";
import type { PlanMutationTrace, ReadinessSnapshot, SitFeatureMode } from "@/lib/sit/types";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function shiftIntensity(intensity: string, delta: number): string {
  const match = intensity.match(/rpe\s*(\d+(\.\d+)?)/i);
  if (!match) {
    if (/high/i.test(intensity) && delta < 0) return "Moderate";
    if (/moderate/i.test(intensity) && delta < 0) return "Easy-moderate";
    return intensity;
  }
  const next = clamp(Number(match[1]) + delta, 4, 9);
  return `RPE ${next}`;
}

function summarizeExercises(exercises: DailyPlanTrainingExercise[]) {
  return exercises.map(({ name, sets, reps, intensity }) => ({ name, sets, reps, intensity }));
}

function mutateExercises(
  exercises: DailyPlanTrainingExercise[],
  factor: number,
  intensityDelta: number,
  rationale: string
): DailyPlanTrainingExercise[] {
  return exercises.map((exercise, index) => {
    const nextSets = clamp(Math.round(exercise.sets * factor), 1, 6);
    const swappedConditioning =
      index === exercises.length - 1 && /burpees|thrusters|devil press|box jumps|battle ropes|sled/i.test(exercise.name);

    if (swappedConditioning) {
      return {
        ...exercise,
        name: "Zone 2 Finisher",
        sets: 1,
        reps: "10-15 min",
        intensity: "Easy-moderate",
        notes: [exercise.notes, rationale, "Conditioning downshifted by readiness policy."].filter(Boolean).join(" "),
      };
    }

    return {
      ...exercise,
      sets: nextSets,
      intensity: shiftIntensity(exercise.intensity, intensityDelta),
      notes: [exercise.notes, rationale].filter(Boolean).join(" "),
    };
  });
}

export function applyReadinessOrchestration(
  plan: DailyPlan,
  snapshot: ReadinessSnapshot,
  mode: SitFeatureMode
): { plan: DailyPlan; mutationTrace?: PlanMutationTrace } {
  if (mode === "off") {
    return { plan };
  }

  const original = plan.training_plan;
  if (!original?.exercises?.length) {
    return { plan };
  }

  let mutated = plan;
  let summary = "Plan left unchanged.";

  if (snapshot.pathway === "amber") {
    summary = "Amber readiness detected. Volume and intensity were downshifted before delivery.";
    mutated = {
      ...plan,
      training_plan: {
        ...original,
        duration_minutes: Math.max(25, Math.min(original.duration_minutes, original.duration_minutes - 5)),
        exercises: mutateExercises(original.exercises, 0.85, -1, "Amber readiness: keep speed crisp and leave more in reserve."),
        alternatives: [
          ...original.alternatives,
          "Amber readiness policy applied: stop the session if technique quality drops.",
        ],
      },
      nutrition_plan: {
        ...plan.nutrition_plan,
        hydration_goal_liters: Math.max(plan.nutrition_plan.hydration_goal_liters, 3),
      },
      safety_notes: [
        ...plan.safety_notes,
        "Amber readiness policy applied. Keep 3 reps in reserve and extend rest periods.",
      ],
    };
  } else if (snapshot.pathway === "red") {
    summary = "Red readiness detected. The session was capped and high-fatigue work was removed.";
    mutated = {
      ...plan,
      training_plan: {
        ...original,
        focus: `Recovery-protected: ${original.focus}`,
        duration_minutes: Math.min(original.duration_minutes, 35),
        exercises: mutateExercises(original.exercises, 0.6, -2, "Red readiness: prioritize movement quality and pain-free range."),
        alternatives: [
          "Red readiness policy applied: convert the day to recovery work if symptoms escalate.",
          ...original.alternatives,
        ],
      },
      nutrition_plan: {
        ...plan.nutrition_plan,
        nutrition_mode: "Recovery",
        hydration_goal_liters: Math.max(plan.nutrition_plan.hydration_goal_liters, 3),
      },
      safety_notes: [
        ...plan.safety_notes,
        "Red readiness policy applied. Heavy loading and high-intensity finishers were removed.",
      ],
    };
  }

  if (snapshot.pathway === "green") {
    summary = "Green readiness confirmed. No mutation was required.";
  }

  const finalPlan = mode === "shadow" ? plan : mutated;
  const mutationTrace: PlanMutationTrace = {
    policy_version: snapshot.policy_version,
    pathway: snapshot.pathway,
    shadow_mode: mode === "shadow",
    reasons: snapshot.reason_codes,
    summary,
    before: {
      duration_minutes: original.duration_minutes,
      exercises: summarizeExercises(original.exercises),
    },
    after: {
      duration_minutes: mutated.training_plan.duration_minutes,
      exercises: summarizeExercises(mutated.training_plan.exercises),
    },
  };

  return {
    plan: finalPlan,
    mutationTrace,
  };
}
