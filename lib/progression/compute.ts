export type PerformedSet = {
  reps?: number | string | null;
  weight_kg?: number | null;
  rir?: number | null;
};

export type ExerciseLogEntry = {
  name?: string;
  sets?: number;
  reps?: number | string;
  weight?: number;
  performed_sets?: PerformedSet[];
};

export type WorkoutLogForProgression = {
  date: string;
  exercises?: ExerciseLogEntry[];
};

export type ProgressionSnapshot = {
  exercise_name: string;
  e1rm: number | null;
  total_volume: number;
  trend_score: number;
  last_performed_date: string | null;
  sample_size: number;
};

function parseRepValue(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value !== "string") return null;
  const match = value.match(/\d+/);
  if (!match) return null;
  const parsed = Number.parseInt(match[0], 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function round(value: number, digits = 2): number {
  const base = 10 ** digits;
  return Math.round(value * base) / base;
}

export function estimateE1rm(weightKg: number, reps: number): number {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return 0;
  const normalizedReps = Math.max(1, Math.min(20, Math.round(reps)));
  return round(weightKg * (1 + normalizedReps / 30), 2);
}

export function normalizeExerciseName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

export function computeProgressionSnapshots(workouts: WorkoutLogForProgression[]): ProgressionSnapshot[] {
  const byExercise = new Map<
    string,
    {
      exercise_name: string;
      e1rms: number[];
      volumes: number[];
      dates: string[];
      sample_size: number;
    }
  >();

  for (const workout of workouts) {
    for (const exercise of workout.exercises ?? []) {
      if (!exercise.name || !exercise.name.trim()) continue;
      const key = normalizeExerciseName(exercise.name);
      const bucket =
        byExercise.get(key) ??
        {
          exercise_name: exercise.name.trim(),
          e1rms: [],
          volumes: [],
          dates: [],
          sample_size: 0,
        };

      const performedSets = Array.isArray(exercise.performed_sets) && exercise.performed_sets.length > 0
        ? exercise.performed_sets
        : [{ reps: exercise.reps, weight_kg: exercise.weight }];

      for (const set of performedSets) {
        const reps = parseRepValue(set.reps ?? null);
        const weight = typeof set.weight_kg === "number" ? set.weight_kg : null;
        if (!reps || !weight || !Number.isFinite(weight) || weight <= 0) continue;

        bucket.sample_size += 1;
        bucket.volumes.push(round(weight * reps, 2));
        bucket.e1rms.push(estimateE1rm(weight, reps));
      }

      if (bucket.sample_size > 0) {
        bucket.dates.push(workout.date);
      }
      byExercise.set(key, bucket);
    }
  }

  const snapshots: ProgressionSnapshot[] = [];
  for (const bucket of Array.from(byExercise.values())) {
    if (bucket.sample_size === 0) continue;

    const avgE1rm = bucket.e1rms.reduce((sum, v) => sum + v, 0) / bucket.e1rms.length;
    const avgVolume = bucket.volumes.reduce((sum, v) => sum + v, 0) / bucket.volumes.length;

    const firstHalf = bucket.e1rms.slice(0, Math.max(1, Math.floor(bucket.e1rms.length / 2)));
    const secondHalf = bucket.e1rms.slice(Math.floor(bucket.e1rms.length / 2));
    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;
    const trendScore = firstAvg > 0 ? round((secondAvg - firstAvg) / firstAvg, 4) : 0;

    snapshots.push({
      exercise_name: bucket.exercise_name,
      e1rm: round(avgE1rm, 2),
      total_volume: round(avgVolume, 2),
      trend_score: trendScore,
      last_performed_date: bucket.dates.sort().at(-1) ?? null,
      sample_size: bucket.sample_size,
    });
  }

  return snapshots.sort((a, b) => a.exercise_name.localeCompare(b.exercise_name));
}
