"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ExerciseEntry } from "@/types";

/** Mock workout for shell: 2 exercises, 2 sets each */
const MOCK_WORKOUT: (ExerciseEntry & { rest_seconds_after_set?: number; form_cues?: string })[] = [
  { name: "Bench Press", sets: 2, reps: 10, weight: 135, rest_seconds_after_set: 90, form_cues: "Keep shoulder blades squeezed." },
  { name: "Squat", sets: 2, reps: 10, weight: 135, rest_seconds_after_set: 120, form_cues: "Break at hips, chest up." },
];

const exercisesForLog = MOCK_WORKOUT.map(({ form_cues, rest_seconds_after_set, ...e }) => ({
  ...e,
  rest_seconds_after_set,
  form_cues,
}));

export default function GuidedWorkoutPage() {
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [phase, setPhase] = useState<"work" | "rest" | "completed">("work");
  const [restSeconds, setRestSeconds] = useState(0);
  const [saved, setSaved] = useState(false);

  const exercise = MOCK_WORKOUT[exerciseIndex];
  const totalExercises = MOCK_WORKOUT.length;
  const totalSets = exercise?.sets ?? 0;
  const isLastSet = setIndex >= totalSets - 1;
  const isLastExercise = exerciseIndex >= totalExercises - 1;

  const persistWorkout = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("workout_logs").insert({
      user_id: user.id,
      date: new Date().toISOString().slice(0, 10),
      workout_type: "strength",
      exercises: exercisesForLog,
      duration_minutes: 30,
    });
    setSaved(true);
  }, []);

  useEffect(() => {
    if (phase !== "rest" || restSeconds <= 0) return;
    const t = setInterval(() => setRestSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [phase, restSeconds]);

  function startRest() {
    if (isLastSet && isLastExercise) {
      setPhase("completed");
      persistWorkout();
      return;
    }
    setPhase("rest");
    setRestSeconds(exercise?.rest_seconds_after_set ?? 90);
  }

  function nextSet() {
    setPhase("work");
    if (isLastSet) {
      if (isLastExercise) return;
      setExerciseIndex((i) => i + 1);
      setSetIndex(0);
    } else {
      setSetIndex((i) => i + 1);
    }
  }

  const progressLabel = `Exercise ${exerciseIndex + 1}/${totalExercises}, Set ${setIndex + 1}/${totalSets}`;

  if (phase === "completed") {
    return (
      <div className="mx-auto max-w-lg px-4 py-6 text-center">
        <h2 className="text-2xl font-bold text-white">Workout complete</h2>
        <p className="mt-2 text-fn-muted">{saved ? "Saved to your log." : "Not signed in — log not saved."}</p>
        <Link href="/log/workout" className="mt-6 inline-block min-h-touch rounded-lg bg-fn-teal px-6 py-3 font-medium text-fn-black">
          Back to workout
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col px-4 py-6 min-h-[80vh]">
      <header className="mb-4 flex items-center justify-between">
        <Link href="/log/workout" className="text-fn-muted hover:text-white">← Back</Link>
        <span className="text-sm text-fn-muted">{progressLabel}</span>
      </header>

      <div className="flex-1 rounded-xl border border-fn-border bg-fn-surface p-6 flex flex-col items-center justify-center text-center">
        {phase === "work" && exercise && (
          <>
            <h2 className="text-2xl font-bold text-white">
              {exercise.name} — Set {setIndex + 1} of {totalSets}
            </h2>
            <p className="mt-4 text-fn-teal text-lg">
              {exercise.reps} reps × {exercise.weight} lb
            </p>
            {exercise.form_cues && (
              <p className="mt-4 text-fn-muted max-w-sm">{exercise.form_cues}</p>
            )}
            <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
              <button
                type="button"
                onClick={startRest}
                className="min-h-touch rounded-lg bg-fn-teal py-3 font-medium text-fn-black hover:bg-fn-teal-dim"
              >
                Done — Start rest
              </button>
              <button
                type="button"
                onClick={nextSet}
                className="min-h-touch rounded-lg border border-fn-border py-3 font-medium text-white hover:bg-fn-surface-hover"
              >
                Skip rest
              </button>
            </div>
          </>
        )}

        {phase === "rest" && (
          <>
            <h2 className="text-xl font-bold text-white">Rest</h2>
            <p className="mt-4 text-4xl font-mono text-fn-teal tabular-nums">{restSeconds}s</p>
            <p className="mt-2 text-fn-muted">Next: {exercise?.name} — Set {setIndex + 2} of {totalSets}</p>
            <button
              type="button"
              onClick={nextSet}
              className="mt-6 min-h-touch rounded-lg border border-fn-border px-6 py-3 font-medium text-white hover:bg-fn-surface-hover"
            >
              Skip rest
            </button>
          </>
        )}
      </div>

      <div className="mt-4 h-2 w-full rounded-full bg-fn-border overflow-hidden">
        <div
          className="h-full bg-fn-teal transition-all duration-300"
          style={{
            width: `${((exerciseIndex * totalSets + setIndex + (phase === "rest" ? 0.5 : 0)) / (totalExercises * totalSets)) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
