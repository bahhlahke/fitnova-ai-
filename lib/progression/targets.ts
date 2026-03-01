import {
  computeProgressionSnapshots,
  normalizeExerciseName,
  type ProgressionSnapshot,
  type WorkoutLogForProgression,
} from "@/lib/progression/compute";

export type ProgressionTarget = {
  exercise_name: string;
  target_load_kg: number | null;
  target_rir: number | null;
  progression_note: string;
  e1rm: number | null;
  trend_score: number;
  sample_size: number;
};

function roundToIncrement(value: number, increment = 2.5): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value / increment) * increment;
}

function pickTarget(snapshot: ProgressionSnapshot): ProgressionTarget {
  const e1rm = snapshot.e1rm ?? 0;
  const baseLoad = e1rm > 0 ? e1rm * 0.72 : 0;
  const trend = snapshot.trend_score;

  let multiplier = 1;
  let note = "Maintain load and focus on clean reps.";
  let targetRir = 2;

  if (trend >= 0.03) {
    multiplier = 1.03;
    note = "Progressing well. Add a small load increase.";
    targetRir = 1;
  } else if (trend <= -0.03) {
    multiplier = 0.96;
    note = "Recent regression detected. Reduce load slightly and own technique.";
    targetRir = 3;
  }

  const targetLoad = baseLoad > 0 ? roundToIncrement(baseLoad * multiplier, 2.5) : null;

  return {
    exercise_name: snapshot.exercise_name,
    target_load_kg: targetLoad,
    target_rir: targetRir,
    progression_note: note,
    e1rm: snapshot.e1rm,
    trend_score: snapshot.trend_score,
    sample_size: snapshot.sample_size,
  };
}

export async function recomputeProgressionSnapshots(supabase: any, userId: string): Promise<ProgressionSnapshot[]> {
  const workoutsRes = await supabase
    .from("workout_logs")
    .select("date, exercises")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(150);

  if (workoutsRes.error) {
    throw new Error(workoutsRes.error.message);
  }

  const workouts = (workoutsRes.data ?? []) as WorkoutLogForProgression[];
  const snapshots = computeProgressionSnapshots(workouts);

  for (const snapshot of snapshots) {
    const upsertRes = await supabase.from("progression_snapshots").upsert(
      {
        user_id: userId,
        exercise_name: snapshot.exercise_name,
        e1rm: snapshot.e1rm,
        total_volume: snapshot.total_volume,
        trend_score: snapshot.trend_score,
        last_performed_date: snapshot.last_performed_date,
        sample_size: snapshot.sample_size,
      },
      { onConflict: "user_id,exercise_name" }
    );

    if (upsertRes.error) {
      throw new Error(upsertRes.error.message);
    }
  }

  return snapshots;
}

export async function getNextTargets(supabase: any, userId: string, exerciseNames?: string[]): Promise<ProgressionTarget[]> {
  let query = supabase
    .from("progression_snapshots")
    .select("exercise_name, e1rm, total_volume, trend_score, last_performed_date, sample_size")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (Array.isArray(exerciseNames) && exerciseNames.length > 0) {
    const normalized = exerciseNames.map((name) => normalizeExerciseName(name));
    query = query.in("exercise_name", normalized);
  }

  const res = await query;
  if (res.error) {
    throw new Error(res.error.message);
  }

  const rows = (res.data ?? []) as ProgressionSnapshot[];
  return rows.map((row) => pickTarget(row));
}
