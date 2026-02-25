"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toLocalDateString } from "@/lib/date/local-date";
import type { DailyPlan } from "@/lib/plan/types";
import {
  getExerciseImageUrl,
  isExerciseGifUrl,
  isExerciseVideoUrl,
} from "@/lib/workout/exercise-images";
import { Button } from "@/components/ui";

type GuidedExercise = {
  name: string;
  sets: number;
  reps: string;
  intensity: string;
  notes?: string;
  image_url?: string | null;
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
  const [postWorkoutInsight, setPostWorkoutInsight] = useState<string | null>(null);
  const [postWorkoutInsightLoading, setPostWorkoutInsightLoading] = useState(false);
  const [planTitle, setPlanTitle] = useState("Personalized session");
  const [exercises, setExercises] = useState<GuidedExercise[]>(FALLBACK_EXERCISES);
  const [injuryBanner, setInjuryBanner] = useState<{ exercise: string; message: string } | null>(null);
  const [injuryBannerDismissed, setInjuryBannerDismissed] = useState(false);
  const workoutStartedAt = useRef<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    supabase.auth
      .getUser()
      .then(async ({ data: { user } }) => {
        if (!user) return;
        const [planRes, profileRes] = await Promise.all([
          supabase
            .from("daily_plans")
            .select("plan_json")
            .eq("user_id", user.id)
            .eq("date_local", toLocalDateString())
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.from("user_profile").select("injuries_limitations").eq("user_id", user.id).maybeSingle(),
        ]);

        const plan = (planRes.data?.plan_json ?? null) as DailyPlan | null;
        if (plan?.training_plan?.exercises?.length) {
          setPlanTitle(plan.training_plan.focus || "Personalized session");
          const newExercises = plan.training_plan.exercises.map((e) => ({
            name: e.name,
            sets: e.sets,
            reps: e.reps,
            intensity: e.intensity,
            notes: e.notes,
            image_url: e.image_url ?? null,
          }));
          setExercises(newExercises);

          const injuries = (profileRes.data as { injuries_limitations?: Record<string, unknown> } | null)?.injuries_limitations;
          const injuriesText = injuries ? JSON.stringify(injuries).toLowerCase() : "";
          if (injuriesText) {
            const conflict = newExercises.find((e) => {
              const name = e.name.toLowerCase();
              const kneeSquat = /knee|knee pain/.test(injuriesText) && /squat|lunge|leg press/.test(name);
              const backHinge = /back|spine|low back/.test(injuriesText) && /deadlift|rdl|squat|barbell row/.test(name);
              const shoulderPress = /shoulder/.test(injuriesText) && /press|push-up|pushup/.test(name);
              return kneeSquat || backHinge || shoulderPress;
            });
            if (conflict) {
              setInjuryBanner({
                exercise: conflict.name,
                message: `This plan includes "${conflict.name}". You noted limitations in your profile. Consider asking the coach for an alternative.`,
              });
            }
          }
        }
      })
      .catch(() => undefined);
  }, []);

  const exercise = exercises[exerciseIndex];
  const totalExercises = exercises.length;
  const totalSets = exercise?.sets ?? 0;
  const isLastSet = setIndex >= totalSets - 1;
  const isLastExercise = exerciseIndex >= totalExercises - 1;
  const totalSetCount = exercises.reduce((sum, e) => sum + e.sets, 0);
  const completedSets =
    exercises.slice(0, exerciseIndex).reduce((s, e) => s + e.sets, 0) +
    setIndex +
    (phase === "rest" ? 1 : 0);
  const progressPct = totalSetCount > 0 ? (completedSets / totalSetCount) * 100 : 0;

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

    const durationMinutes = workoutStartedAt.current
      ? Math.max(1, Math.round((Date.now() - workoutStartedAt.current) / 60_000))
      : Math.max(20, exercises.length * 10);

    const payload = {
      user_id: user.id,
      date: toLocalDateString(),
      workout_type: "strength" as const,
      exercises: exercises.map((e) => ({
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        weight: undefined,
        rest_seconds_after_set: 90,
        form_cues: e.notes,
      })),
      duration_minutes: durationMinutes,
      notes: `Guided: ${planTitle}`,
    };

    const { error } = await supabase.from("workout_logs").insert(payload);

    if (error) {
      setSaveError(error.message);
      return;
    }
    setSaved(true);
  }, [exercises, planTitle]);

  useEffect(() => {
    if (!saved) return;
    setPostWorkoutInsightLoading(true);
    fetch("/api/v1/ai/post-workout-insight", { method: "POST" })
      .then((r) => r.json())
      .then((body: { insight?: string | null }) => {
        if (body.insight && typeof body.insight === "string") setPostWorkoutInsight(body.insight);
      })
      .catch(() => {})
      .finally(() => setPostWorkoutInsightLoading(false));
  }, [saved]);

  useEffect(() => {
    if (phase === "work" && exercise && workoutStartedAt.current === null) {
      workoutStartedAt.current = Date.now();
    }
  }, [phase, exercise]);

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
    if (isLastSet && isLastExercise) {
      setPhase("completed");
      void persistWorkout();
      return;
    }
    setPhase("work");
    if (isLastSet) {
      setExerciseIndex((i) => i + 1);
      setSetIndex(0);
    } else {
      setSetIndex((i) => i + 1);
    }
  }

  if (phase === "completed") {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-shell flex-col items-center justify-center px-4 py-10 text-center sm:px-6">
        <h2 className="font-display text-4xl text-fn-ink">Workout complete</h2>
        <p className="mt-2 text-fn-muted">
          {saved ? "Session saved to your log." : saveError ?? "Session complete."}
        </p>
        {postWorkoutInsightLoading && (
          <p className="mt-4 text-sm text-fn-muted">What this means...</p>
        )}
        {postWorkoutInsight && !postWorkoutInsightLoading && (
          <div className="mt-4 max-w-md rounded-xl border border-fn-border bg-fn-bg-alt px-4 py-3 text-left text-sm text-fn-ink">
            <p className="font-semibold text-fn-ink">What this means</p>
            <p className="mt-1">{postWorkoutInsight}</p>
          </div>
        )}
        <Link href="/log/workout" className="mt-8">
          <Button>Back to workout</Button>
        </Link>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="mx-auto max-w-shell px-4 py-10 sm:px-6">
        <p className="text-fn-muted">No exercises in this plan.</p>
        <Link href="/log/workout" className="mt-4 inline-block">
          <Button variant="secondary">Back</Button>
        </Link>
      </div>
    );
  }

  const imageUrl = getExerciseImageUrl(exercise.name, exercise.image_url);
  const progressLabel = `Move ${exerciseIndex + 1}/${totalExercises} · Set ${setIndex + 1}/${totalSets}`;

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-shell flex-col bg-fn-bg px-0 py-0">
      {/* Progress bar - fixed at top for gym use */}
      <div className="sticky top-0 z-10 h-1.5 w-full overflow-hidden bg-fn-border">
        <div
          className="h-full bg-fn-primary transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {injuryBanner && !injuryBannerDismissed && (
        <div className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p className="font-semibold">Injury note</p>
          <p className="mt-1">{injuryBanner.message}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href="/coach" className="text-sm font-semibold text-fn-primary hover:underline">
              Ask coach for alternative
            </Link>
            <button type="button" onClick={() => setInjuryBannerDismissed(true)} className="text-sm font-semibold text-fn-muted hover:underline">
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col px-4 pb-6 pt-4">
        <header className="mb-3 flex items-center justify-between">
          <Link
            href="/log/workout"
            className="min-h-touch min-w-touch rounded-lg px-2 py-2 text-sm font-semibold text-fn-muted hover:bg-white hover:text-fn-ink"
          >
            ← Back
          </Link>
          <span className="text-xs font-medium text-fn-muted tabular-nums">
            {progressLabel}
          </span>
        </header>

        {phase === "work" && (
          <>
            {/* Large move media: animated (video/GIF) for form, or static image */}
            <div className="relative mb-4 aspect-[4/3] w-full overflow-hidden rounded-2xl border border-fn-border bg-white shadow-fn-card">
              {isExerciseVideoUrl(imageUrl) ? (
                <video
                  src={imageUrl}
                  className="absolute inset-0 h-full w-full object-cover"
                  loop
                  muted
                  autoPlay
                  playsInline
                  aria-label={exercise.name}
                />
              ) : isExerciseGifUrl(imageUrl) ? (
                <img
                  src={imageUrl}
                  alt={exercise.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <Image
                  src={imageUrl}
                  alt={exercise.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 72rem"
                  priority
                />
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-fn-ink/80 to-transparent p-4">
                <h2 className="text-xl font-semibold text-white drop-shadow">
                  {exercise.name}
                </h2>
                <p className="mt-1 text-sm text-white/90">
                  Set {setIndex + 1} of {totalSets}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-fn-border bg-white p-4 shadow-fn-soft">
              <p className="text-lg font-semibold text-fn-primary">
                {exercise.reps} reps · {exercise.intensity}
              </p>
              {exercise.notes && (
                <p className="mt-2 text-sm text-fn-muted">{exercise.notes}</p>
              )}
              <p className="mt-3 text-xs text-fn-muted">
                {planTitle} · AI guidance is educational. Stop if pain worsens.
              </p>
            </div>

            {/* Large gym-friendly actions */}
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={startRest}
                className="min-h-touch w-full rounded-2xl bg-fn-primary py-4 text-lg font-semibold text-white shadow-fn-soft"
              >
                Done — Start rest
              </button>
              <button
                type="button"
                onClick={nextSet}
                className="min-h-touch w-full rounded-2xl border border-fn-border bg-white py-3 text-base font-semibold text-fn-ink"
              >
                Skip rest
              </button>
            </div>
          </>
        )}

        {phase === "rest" && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-fn-muted">Rest</p>
            <p className="mt-2 font-mono text-6xl font-bold tabular-nums text-fn-primary">
              {restSeconds}s
            </p>
            <p className="mt-2 text-sm text-fn-muted">
              Next: {exercise.name} · Set {setIndex + 2} of {totalSets}
            </p>
            <button
              type="button"
              onClick={nextSet}
              className="mt-8 min-h-touch rounded-2xl border border-fn-border bg-white px-8 py-4 text-base font-semibold text-fn-ink"
            >
              Skip rest
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
