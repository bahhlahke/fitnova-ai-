import type { DailyPlan, DailyPlanTrainingExercise } from "@/lib/plan/types";
import type { SafetyIssue, SafetyValidationResult } from "@/lib/sit/types";

type WorkoutRow = {
  date?: string | null;
  exercises?: Array<{ name?: string; sets?: number | null }> | null;
};

type DailyPlanRow = {
  date_local?: string | null;
  plan_json?: {
    training_plan?: {
      exercises?: DailyPlanTrainingExercise[];
    };
  } | null;
};

type ValidatePrescriptionInput = {
  plan: DailyPlan;
  profile?: Record<string, unknown> | null;
  workouts: WorkoutRow[];
  priorPlans: DailyPlanRow[];
  policyVersion?: string;
  painFlags?: string[];
};

const MOVEMENT_PATTERNS: Array<{ pattern: string; regex: RegExp }> = [
  { pattern: "squat", regex: /squat|lunge|leg press|split squat|step-up/i },
  { pattern: "hinge", regex: /deadlift|rdl|hinge|swing|good morning/i },
  { pattern: "push", regex: /press|push-up|dip/i },
  { pattern: "pull", regex: /row|pulldown|pull-up|chin-up|face pull/i },
  { pattern: "conditioning", regex: /burpee|bike|sled|rope|jump|thruster|devil press|finisher/i },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseRpe(value: string): number {
  const match = value.match(/rpe\s*(\d+(\.\d+)?)/i);
  if (match) return Number(match[1]);
  if (/high/i.test(value)) return 8;
  if (/moderate/i.test(value)) return 6.5;
  if (/easy/i.test(value) || /controlled/i.test(value)) return 5.5;
  return 6.5;
}

function experienceMultiplier(profile?: Record<string, unknown> | null): number {
  const level = String(profile?.experience_level ?? "intermediate").toLowerCase();
  if (level === "beginner") return 1;
  if (level === "advanced") return 1.45;
  return 1.25;
}

function countPatternSets(exercises: Array<{ name?: string; sets?: number | null }> | undefined): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const exercise of exercises ?? []) {
    const match = MOVEMENT_PATTERNS.find((candidate) => candidate.regex.test(exercise.name ?? ""));
    if (!match) continue;
    counts[match.pattern] = (counts[match.pattern] ?? 0) + Math.max(1, Number(exercise.sets) || 0);
  }
  return counts;
}

function highIntensityDayCount(priorPlans: DailyPlanRow[]): number {
  let count = 0;
  for (const row of priorPlans) {
    const exercises = row.plan_json?.training_plan?.exercises ?? [];
    if (exercises.some((exercise) => parseRpe(exercise.intensity) >= 8 || /high/i.test(exercise.intensity))) {
      count += 1;
    }
  }
  return count;
}

export function validatePrescription({
  plan,
  profile,
  workouts,
  priorPlans,
  policyVersion = "safety-validator-v1",
  painFlags = [],
}: ValidatePrescriptionInput): SafetyValidationResult {
  const issues: SafetyIssue[] = [];
  const multiplier = experienceMultiplier(profile);
  const currentCounts = countPatternSets(plan.training_plan.exercises);
  const historicalCounts = countPatternSets(
    workouts.flatMap((workout) => workout.exercises ?? [])
  );

  for (const [pattern, sets] of Object.entries(currentCounts)) {
    const baseline = historicalCounts[pattern] ?? 0;
    const allowedIncrease = Math.max(2, Math.round((baseline || 6) * (0.35 * multiplier)));
    if (sets > baseline + allowedIncrease) {
      issues.push({
        code: "weekly_set_delta_cap",
        message: `${pattern} volume exceeds the weekly set delta cap for the user's recent baseline.`,
        severity: sets > baseline + allowedIncrease + 4 ? "block" : "warning",
      });
    }
  }

  const highestPlannedRpe = Math.max(...plan.training_plan.exercises.map((exercise) => parseRpe(exercise.intensity)));
  const allowedRpe = multiplier >= 1.4 ? 8.5 : multiplier >= 1.2 ? 8 : 7;
  if (highestPlannedRpe > allowedRpe) {
    issues.push({
      code: "intensity_delta_cap",
      message: `Planned intensity exceeds the cap for the user's training age.`,
      severity: highestPlannedRpe >= allowedRpe + 1 ? "block" : "warning",
    });
  }

  if (highIntensityDayCount(priorPlans) >= 2 && highestPlannedRpe >= 8) {
    issues.push({
      code: "high_intensity_day_limit",
      message: "Rolling high-intensity day limit exceeded.",
      severity: "warning",
    });
  }

  const latestWorkout = [...workouts]
    .filter((workout) => workout.date)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  if (latestWorkout?.date === plan.date_local && highestPlannedRpe >= 8) {
    issues.push({
      code: "minimum_recovery_spacing",
      message: "A high-intensity session cannot be prescribed twice on the same day.",
      severity: "block",
    });
  }

  if (painFlags.length > 0 && highestPlannedRpe >= 7.5) {
    issues.push({
      code: "pain_guardrail",
      message: "Pain flags require a lower-intensity prescription.",
      severity: "block",
    });
  }

  if (issues.some((issue) => issue.severity === "block")) {
    return {
      status: "blocked",
      plan,
      issues,
      policy_version: policyVersion,
    };
  }

  if (issues.length === 0) {
    return {
      status: "pass",
      plan,
      issues,
      policy_version: policyVersion,
    };
  }

  return {
    status: "modified",
    issues,
    policy_version: policyVersion,
    plan: {
      ...plan,
      training_plan: {
        ...plan.training_plan,
        duration_minutes: Math.max(20, plan.training_plan.duration_minutes - 5),
        exercises: plan.training_plan.exercises.map((exercise) => ({
          ...exercise,
          sets: clamp(exercise.sets - 1, 1, 5),
          intensity: parseRpe(exercise.intensity) >= 8 ? "RPE 7" : exercise.intensity,
          notes: [exercise.notes, "Safety validator reduced loading to stay inside policy."].filter(Boolean).join(" "),
        })),
      },
      safety_notes: [
        ...plan.safety_notes,
        "Safety validator modified the prescription to stay within weekly load and intensity caps.",
      ],
    },
  };
}
