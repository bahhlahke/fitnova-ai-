import type { DailyPlanTrainingExercise } from "@/lib/plan/types";

const SECOND_UNITS = ["s", "sec", "secs", "second", "seconds"];
const MINUTE_UNITS = ["m", "min", "mins", "minute", "minutes"];

function parseDurationToken(
  value: string,
  units: string[],
  multiplier: number,
): number | null {
  const match = value.match(new RegExp(`(\\d+)\\s*(?:${units.join("|")})\\b`, "i"));
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount * multiplier;
}

export function getExerciseRestSeconds(
  exercise: Pick<DailyPlanTrainingExercise, "rest_seconds_after_set">,
): number {
  const seconds = Number(exercise.rest_seconds_after_set);
  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : 60;
}

export function parseTimedWorkSeconds(reps?: string | null): number | null {
  const normalized = reps?.trim().toLowerCase();
  if (!normalized) return null;

  const explicitWork = normalized.split("/")[0]?.trim() ?? normalized;
  const seconds = parseDurationToken(explicitWork, SECOND_UNITS, 1);
  if (seconds != null) return seconds;

  const minutes = parseDurationToken(explicitWork, MINUTE_UNITS, 60);
  if (minutes != null) return minutes;

  return null;
}

export function getNumericRepPlaceholder(reps?: string | null): string {
  const match = reps?.match(/\d+/);
  return match?.[0] ?? "0";
}
