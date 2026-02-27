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
  video_url?: string | null;
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
            video_url: e.video_url ?? null,
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
                message: `Protect your body. Tap to swap "${conflict.name}" for a pain-free alternative.`,
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
      .catch(() => { })
      .finally(() => setPostWorkoutInsightLoading(false));
  }, [saved]);

  useEffect(() => {
    if (phase === "work" && exercise && workoutStartedAt.current === null) {
      workoutStartedAt.current = Date.now();
    }
  }, [phase, exercise]);

  const nextSet = useCallback(() => {
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
  }, [isLastSet, isLastExercise, persistWorkout]);

  const startRest = useCallback(() => {
    if (isLastSet && isLastExercise) {
      setPhase("completed");
      void persistWorkout();
      return;
    }
    setPhase("rest");
    setRestSeconds(90);
  }, [isLastSet, isLastExercise, persistWorkout]);

  useEffect(() => {
    if (phase !== "rest") return;
    if (restSeconds <= 0) {
      if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate([200, 100, 200]);
      }
      nextSet();
      return;
    }
    const t = setInterval(() => setRestSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [phase, restSeconds, nextSet]);

  if (phase === "completed") {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-shell flex-col items-center justify-center px-4 py-10 text-center sm:px-6">
        <h2 className="font-display text-4xl text-fn-ink">Workout complete</h2>
        <p className="mt-2 text-fn-muted">
          {saved ? "Great work! Session saved to your log." : saveError ?? "Session complete."}
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

  const imageUrl = getExerciseImageUrl(exercise.name, exercise.video_url || exercise.image_url);
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
              Swap this move
            </Link>
            <button type="button" onClick={() => setInjuryBannerDismissed(true)} className="text-sm font-semibold text-fn-muted hover:underline">
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col px-4 pb-6 pt-4">
        <header className="mb-5 flex items-center justify-between">
          <Link
            href="/log/workout"
            className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-semibold text-fn-muted hover:bg-white/10 hover:text-white transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            End
          </Link>
          <span className="rounded-full bg-fn-accent/10 px-3 py-1 text-xs font-bold tracking-widest text-fn-accent uppercase">
            {progressLabel}
          </span>
        </header>

        {phase === "work" && (
          <>
            {/* Large move media: animated (video/GIF) for form, or static image */}
            <div className="relative mb-6 aspect-[4/5] sm:aspect-video w-full overflow-hidden rounded-[2rem] border border-white/5 bg-black shadow-2xl">
              {isExerciseVideoUrl(imageUrl) ? (
                <video
                  src={imageUrl}
                  className="absolute inset-0 h-full w-full object-cover opacity-80"
                  loop
                  muted
                  autoPlay
                  playsInline
                  aria-label={exercise.name}
                />
              ) : isExerciseGifUrl(imageUrl) ? (
                <Image
                  src={imageUrl}
                  alt={exercise.name}
                  fill
                  className="object-cover opacity-80"
                  sizes="(max-width: 768px) 100vw, 72rem"
                  unoptimized
                />
              ) : (
                <Image
                  src={imageUrl}
                  alt={exercise.name}
                  fill
                  className="object-cover opacity-80"
                  sizes="(max-width: 768px) 100vw, 72rem"
                  priority
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                <p className="mb-1 text-xs font-black uppercase tracking-[0.3em] text-fn-accent">
                  Set {setIndex + 1} of {totalSets}
                </p>
                <h2 className="font-display text-4xl font-black italic tracking-tighter text-white sm:text-5xl uppercase">
                  {exercise.name}
                </h2>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-6 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-fn-muted mb-1">Target</span>
                  <p className="text-3xl font-black text-white">{exercise.reps} reps</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase tracking-widest text-fn-muted mb-1">Intensity</span>
                  <p className="text-xl font-black text-fn-accent">{exercise.intensity}</p>
                </div>
              </div>

              {exercise.notes && (
                <div className="mt-4 rounded-xl bg-black/40 p-4 border border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-fn-accent mb-2">Coach's Notes</p>
                  <p className="text-sm font-medium leading-relaxed text-white/80">{exercise.notes}</p>
                </div>
              )}
            </div>

            <p className="mt-6 px-1 text-center text-[10px] font-bold uppercase tracking-widest text-fn-muted/50">
              {planTitle} · AI guidance is educational. Stop if pain worsens.
            </p>

            {/* Large gym-friendly actions */}
            <div className="mt-auto pt-6 pb-4">
              <button
                type="button"
                onClick={startRest}
                className="w-full rounded-full bg-fn-accent py-5 text-lg font-black uppercase tracking-wider text-black shadow-[0_0_30px_rgba(10,217,196,0.3)] transition-transform active:scale-[0.98] hover:bg-white"
              >
                Log Set & Rest
              </button>
            </div>
          </>
        )}

        {phase === "rest" && (
          <div className="flex flex-1 flex-col items-center justify-center text-center p-6">
            <div className="relative flex items-center justify-center w-64 h-64 mb-8">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                <circle cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={754} strokeDashoffset={754 - (754 * (restSeconds / 90))} className="text-fn-accent transition-all duration-1000 ease-linear" />
              </svg>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-muted mb-2">Rest</span>
                <p className="font-display text-7xl font-black italic tracking-tighter text-white tabular-nums">
                  {restSeconds}
                </p>
                <span className="text-sm font-bold text-fn-muted">sec</span>
              </div>
            </div>

            <div className="mb-12">
              <p className="text-[10px] font-black uppercase tracking-widest text-fn-accent mb-2 block">Up Next</p>
              <p className="text-2xl font-black text-white">
                {exercise.name}
              </p>
              <p className="text-sm font-bold text-fn-muted mt-1">Set {setIndex + 2} of {totalSets}</p>
            </div>

            <button
              type="button"
              onClick={nextSet}
              className={`w-full max-w-sm rounded-full py-5 text-sm font-black uppercase tracking-widest transition-all duration-300 ${restSeconds <= 10
                ? "bg-fn-accent text-black shadow-[0_0_30px_rgba(10,217,196,0.3)] hover:bg-white"
                : "bg-white/10 text-white hover:bg-white/20"
                }`}
            >
              Skip Rest
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
