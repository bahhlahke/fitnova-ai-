"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toLocalDateString } from "@/lib/date/local-date";
import type { DailyPlan } from "@/lib/plan/types";

type GuidedExercise = {
  name: string;
  sets: number;
  reps: string;
  intensity: string;
  notes?: string;
};

const FALLBACK_EXERCISES: GuidedExercise[] = [
  { name: "Goblet Squat", sets: 3, reps: "10", intensity: "RPE 6-7" },
  { name: "Push-up", sets: 3, reps: "8-12", intensity: "RPE 7" },
  { name: "Dumbbell RDL", sets: 3, reps: "10", intensity: "RPE 7" },
];

export default function GuidedWorkoutPage() {
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [phase, setPhase] = useState<"work" | "rest" | "completed">("work");
  const [restSeconds, setRestSeconds] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [planTitle, setPlanTitle] = useState("Personalized session");
  const [exercises, setExercises] = useState<GuidedExercise[]>(FALLBACK_EXERCISES);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    supabase.auth
      .getUser()
      .then(async ({ data: { user } }) => {
        if (!user) return;
        const { data } = await supabase
          .from("daily_plans")
          .select("plan_json")
          .eq("user_id", user.id)
          .eq("date_local", toLocalDateString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const plan = (data?.plan_json ?? null) as DailyPlan | null;
        if (plan?.training_plan?.exercises?.length) {
          setPlanTitle(plan.training_plan.focus || "Personalized session");
          setExercises(plan.training_plan.exercises);
        }
      })
      .catch(() => undefined);
  }, []);

  const exercise = exercises[exerciseIndex];
  const totalExercises = exercises.length;
  const totalSets = exercise?.sets ?? 0;
  const isLastSet = setIndex >= totalSets - 1;
  const isLastExercise = exerciseIndex >= totalExercises - 1;

  const persistWorkout = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setSaveError("Supabase is not configured.");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaveError("Sign in to save workout.");
      return;
    }

    const { error } = await supabase.from("workout_logs").insert({
      user_id: user.id,
      date: toLocalDateString(),
      workout_type: "strength",
      exercises,
      duration_minutes: Math.max(20, exercises.length * 10),
    });

    if (error) {
      setSaveError(error.message);
      return;
    }

    setSaved(true);
  }, [exercises]);

  useEffect(() => {
    if (phase !== "rest" || restSeconds <= 0) return;
    const t = setInterval(() => setRestSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [phase, restSeconds]);

  function startRest() {
    if (isLastSet && isLastExercise) {
      setPhase("completed");
      void persistWorkout();
      return;
    }
    setPhase("rest");
    setRestSeconds(90);
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
        <p className="mt-2 text-fn-muted">
          {saved ? "Saved to your log." : saveError ?? "Workout complete."}
        </p>
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

      <div className="mb-2 rounded-lg border border-fn-border bg-fn-surface p-3">
        <p className="text-sm text-white">{planTitle}</p>
        <p className="mt-1 text-xs text-fn-muted">Educational guidance only. Stop if pain worsens.</p>
      </div>

      <div className="flex-1 rounded-xl border border-fn-border bg-fn-surface p-6 flex flex-col items-center justify-center text-center">
        {phase === "work" && exercise && (
          <>
            <h2 className="text-2xl font-bold text-white">
              {exercise.name} — Set {setIndex + 1} of {totalSets}
            </h2>
            <p className="mt-4 text-fn-teal text-lg">
              {exercise.reps} · {exercise.intensity}
            </p>
            {exercise.notes && (
              <p className="mt-4 text-fn-muted max-w-sm">{exercise.notes}</p>
            )}
            <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
              <button
                type="button"
                onClick={startRest}
                className="min-h-touch rounded-lg bg-fn-teal py-3 font-medium text-fn-black hover:bg-fn-teal-dim"
              >
                Done - Start rest
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
            width: `${((exerciseIndex * totalSets + setIndex + (phase === "rest" ? 0.5 : 0)) / Math.max(1, totalExercises * totalSets)) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
