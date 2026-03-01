import { normalizeExerciseName } from "@/lib/progression/compute";

export type ProgressionTrendPoint = {
  date: string;
  exercise_name: string;
  e1rm: number;
  volume: number;
};

export type ProgressionMetric = {
  exercise_name: string;
  current_e1rm: number;
  baseline_e1rm: number;
  trend_pct: number;
  volume_landmark: "up" | "stable" | "down";
  adherence_score: number;
};

export type ProgressionAnalytics = {
  metrics: ProgressionMetric[];
  trend_points: ProgressionTrendPoint[];
  adherence_avg: number | null;
};

type WorkoutLog = {
  date: string;
  exercises?: Array<{
    name?: string;
    performed_sets?: Array<{ reps?: number | string; weight_kg?: number | null }>;
    reps?: number | string;
    weight?: number | null;
  }>;
};

type SnapshotRow = {
  exercise_name: string;
  e1rm?: number | null;
  total_volume?: number | null;
  trend_score?: number | null;
  sample_size?: number | null;
};

type AdherenceRow = {
  date_local: string;
  total_score?: number | null;
};

function round(value: number, digits = 2): number {
  const base = 10 ** digits;
  return Math.round(value * base) / base;
}

function parseReps(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.round(value);
  if (typeof value !== "string") return null;
  const match = value.match(/\d+/);
  if (!match) return null;
  const n = Number.parseInt(match[0], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function estimateE1rm(weight: number, reps: number): number {
  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) return 0;
  return weight * (1 + reps / 30);
}

export function buildProgressionAnalytics(
  workouts: WorkoutLog[],
  snapshots: SnapshotRow[],
  adherenceRows: AdherenceRow[] = []
): ProgressionAnalytics {
  const trendPoints: ProgressionTrendPoint[] = [];

  for (const workout of workouts) {
    for (const exercise of workout.exercises ?? []) {
      const name = typeof exercise.name === "string" ? exercise.name.trim() : "";
      if (!name) continue;

      const sets = Array.isArray(exercise.performed_sets) && exercise.performed_sets.length > 0
        ? exercise.performed_sets
        : [{ reps: exercise.reps, weight_kg: exercise.weight ?? null }];

      const e1rmValues: number[] = [];
      let totalVolume = 0;

      for (const set of sets) {
        const reps = parseReps(set.reps);
        const weight = Number(set.weight_kg ?? 0);
        if (!reps || !Number.isFinite(weight) || weight <= 0) continue;
        e1rmValues.push(estimateE1rm(weight, reps));
        totalVolume += weight * reps;
      }

      if (e1rmValues.length === 0) continue;

      trendPoints.push({
        date: workout.date,
        exercise_name: name,
        e1rm: round(e1rmValues.reduce((sum, entry) => sum + entry, 0) / e1rmValues.length, 2),
        volume: round(totalVolume, 2),
      });
    }
  }

  const byExercise = new Map<string, ProgressionTrendPoint[]>();
  for (const point of trendPoints) {
    const key = normalizeExerciseName(point.exercise_name);
    const list = byExercise.get(key) ?? [];
    list.push(point);
    byExercise.set(key, list);
  }

  const metrics: ProgressionMetric[] = [];

  for (const snapshot of snapshots) {
    const key = normalizeExerciseName(snapshot.exercise_name);
    const points = (byExercise.get(key) ?? []).sort((a, b) => a.date.localeCompare(b.date));
    const baseline = points[0]?.e1rm ?? Number(snapshot.e1rm ?? 0);
    const current = points[points.length - 1]?.e1rm ?? Number(snapshot.e1rm ?? 0);

    const trendPct = baseline > 0 ? ((current - baseline) / baseline) * 100 : Number(snapshot.trend_score ?? 0) * 100;

    const firstVolume = points[0]?.volume ?? Number(snapshot.total_volume ?? 0);
    const lastVolume = points[points.length - 1]?.volume ?? Number(snapshot.total_volume ?? 0);
    const volumeDelta = firstVolume > 0 ? (lastVolume - firstVolume) / firstVolume : 0;

    const volumeLandmark: ProgressionMetric["volume_landmark"] =
      volumeDelta > 0.08 ? "up" : volumeDelta < -0.08 ? "down" : "stable";

    metrics.push({
      exercise_name: snapshot.exercise_name,
      current_e1rm: round(current, 2),
      baseline_e1rm: round(baseline, 2),
      trend_pct: round(trendPct, 2),
      volume_landmark: volumeLandmark,
      adherence_score: round(Math.max(0, Math.min(1, Number(snapshot.sample_size ?? 0) / 12)), 2),
    });
  }

  metrics.sort((a, b) => b.current_e1rm - a.current_e1rm);

  const adherenceValues = adherenceRows
    .map((row) => Number(row.total_score))
    .filter((value) => Number.isFinite(value))
    .map((value) => Math.max(0, Math.min(1, value)));

  const adherenceAvg =
    adherenceValues.length > 0
      ? round(adherenceValues.reduce((sum, value) => sum + value, 0) / adherenceValues.length, 2)
      : null;

  return {
    metrics,
    trend_points: trendPoints.sort((a, b) => a.date.localeCompare(b.date)),
    adherence_avg: adherenceAvg,
  };
}
