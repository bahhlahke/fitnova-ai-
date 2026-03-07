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
import { emitDataRefresh } from "@/lib/ui/data-sync";

type GuidedExercise = {
  name: string;
  sets: number;
  reps: string;
  intensity: string;
  notes?: string;
  tempo?: string;
  breathing?: string;
  intent?: string;
  rationale?: string;
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
  const [phase, setPhase] = useState<"loading" | "overview" | "work" | "rest" | "completed">("loading");
  const [restSeconds, setRestSeconds] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [postWorkoutInsight, setPostWorkoutInsight] = useState<string | null>(null);
  const [postWorkoutInsightLoading, setPostWorkoutInsightLoading] = useState(false);
  const [planTitle, setPlanTitle] = useState("Personalized session");
  const [exercises, setExercises] = useState<GuidedExercise[]>(FALLBACK_EXERCISES);
  const [injuryBanner, setInjuryBanner] = useState<{ exercise: string; message: string } | null>(null);
  const [injuryBannerDismissed, setInjuryBannerDismissed] = useState(false);
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapFeedback, setSwapFeedback] = useState<string | null>(null);
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [coachQuestion, setCoachQuestion] = useState("");
  const [coachReply, setCoachReply] = useState<string | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [showExpertCues, setShowExpertCues] = useState(false);
  const [isSwapOptionsVisible, setIsSwapOptionsVisible] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const workoutStartedAt = useRef<number | null>(null);

  const playCoachAudio = useCallback(async (contextStr: string, metrics?: any) => {
    if (!audioEnabled || !("speechSynthesis" in window)) return;

    // Stop anything currently playing
    window.speechSynthesis.cancel();

    try {
      setIsPlayingAudio(true);
      const res = await fetch("/api/v1/coach/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: contextStr, metrics })
      });
      const data = await res.json();

      if (data.script) {
        // Fallback simulation of OpenAI TTS stream using browser Synthesis
        const utterance = new SpeechSynthesisUtterance(data.script);
        const voices = window.speechSynthesis.getVoices();
        // Look for a pleasant/upbeat voice
        const preferredVoice = voices.find(v => v.lang === "en-US" && (v.name.includes("Samantha") || v.name.includes("Karen") || v.name.includes("Victoria")));
        if (preferredVoice) utterance.voice = preferredVoice;

        // Slightly faster and higher pitch for energetic/sexy/motivational tone
        utterance.rate = 1.05;
        utterance.pitch = 1.2;

        utterance.onend = () => setIsPlayingAudio(false);
        utterance.onerror = () => setIsPlayingAudio(false);

        window.speechSynthesis.speak(utterance);
      } else {
        setIsPlayingAudio(false);
      }
    } catch (e) {
      console.error("Audio playback error:", e);
      setIsPlayingAudio(false);
    }
  }, [audioEnabled]);

  // Load voices proactively
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    supabase.auth
      .getUser()
      .then(async ({ data: { user } }) => {
        if (!user) {
          setPhase("work");
          return;
        }
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
            tempo: e.tempo,
            breathing: e.breathing,
            intent: e.intent,
            rationale: e.rationale,
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
          setPhase("overview");
        } else {
          setPhase("work"); // Fallback if no specific plan
        }
      })
      .catch(() => setPhase("work"));
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
    emitDataRefresh(["dashboard", "workout"]);
    // Trigger award check and PR calculation
    fetch("/api/v1/awards/check", { method: "POST" }).catch(() => { });
    fetch("/api/v1/analytics/process-prs", { method: "POST" }).catch(() => { });
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
      void playCoachAudio("finish_workout");
      return;
    }
    setPhase("work");
    void playCoachAudio("start_set");
    if (isLastSet) {
      setExerciseIndex((i) => i + 1);
      setSetIndex(0);
    } else {
      setSetIndex((i) => i + 1);
    }
  }, [isLastSet, isLastExercise, persistWorkout]);

  const swapCurrentExercise = useCallback(
    async (reason: string) => {
      if (!exercise) return;
      setSwapLoading(true);
      setSwapFeedback(null);
      try {
        const res = await fetch("/api/v1/plan/swap-exercise", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentExercise: exercise.name,
            reason,
            sets: exercise.sets,
            reps: exercise.reps,
            intensity: exercise.intensity,
          }),
        });
        const body = (await res.json()) as {
          replacement?: GuidedExercise;
          reliability?: { confidence_score?: number; explanation?: string };
          error?: string;
        };
        if (!res.ok || !body.replacement) {
          setSwapFeedback(body.error ?? "Could not generate substitution.");
          return;
        }
        setExercises((current) =>
          current.map((entry, index) =>
            index === exerciseIndex
              ? {
                ...entry,
                ...body.replacement,
              }
              : entry
          )
        );
        setSwapFeedback(
          `Swapped to ${body.replacement.name}. ` +
          (body.reliability?.confidence_score != null
            ? `AI confidence ${Math.round(body.reliability.confidence_score * 100)}%.`
            : "")
        );
        setInjuryBannerDismissed(true);
      } catch {
        setSwapFeedback("Substitution failed. Try again.");
      } finally {
        setSwapLoading(false);
      }
    },
    [exercise, exerciseIndex, playCoachAudio]
  );

  const askCoach = useCallback(async () => {
    if (!coachQuestion.trim() || !exercise) return;
    setCoachLoading(true);
    setCoachReply(null);
    try {
      const res = await fetch("/api/v1/ai/workout-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: coachQuestion,
          exercise: exercise.name,
          context: {
            set: setIndex + 1,
            totalSets: exercise.sets,
            intensity: exercise.intensity
          }
        }),
      });
      const data = await res.json();
      setCoachReply(data.reply);
      setCoachQuestion("");
    } catch {
      setCoachReply("I'm having trouble connecting right now. Focus on your form and keep going!");
    } finally {
      setCoachLoading(false);
    }
  }, [coachQuestion, exercise, setIndex]);

  const startRest = useCallback(() => {
    if (isLastSet && isLastExercise) {
      setPhase("completed");
      void persistWorkout();
      void playCoachAudio("finish_workout");
      return;
    }
    setPhase("rest");
    setRestSeconds(90);
    void playCoachAudio("finish_set", { hrv: 85 });
  }, [isLastSet, isLastExercise, persistWorkout, playCoachAudio]);

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

  const startWorkout = useCallback(() => {
    workoutStartedAt.current = Date.now();
    setPhase("work");
    void playCoachAudio("start_workout");
  }, [playCoachAudio]);

  if (phase === "loading") {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-shell flex-col items-center justify-center bg-fn-bg px-6 text-center">
        <div className="h-12 w-12 rounded-full border-2 border-fn-accent/20 border-t-fn-accent animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-fn-accent">Neural Initialization</p>
        <p className="mt-2 text-sm font-medium text-fn-ink/40">Calibrating session sequence...</p>
      </div>
    );
  }

  if (phase === "overview") {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-shell flex-col bg-fn-bg">
        <div className="flex-1 overflow-y-auto px-6 py-10 pb-32">
          <header className="mb-10">
            <Link href="/log/workout" className="text-sm font-bold text-fn-muted hover:text-white transition-colors flex items-center gap-2 mb-6">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Exit
            </Link>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-fn-accent mb-2">Session Overview</p>
            <h1 className="font-display text-5xl font-black italic tracking-tighter text-white uppercase leading-none">
              {planTitle}
            </h1>
            <div className="mt-6 flex flex-wrap gap-4">
              <div className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 border border-white/5">
                <span className="h-1.5 w-1.5 rounded-full bg-fn-accent" />
                <span className="text-[11px] font-black uppercase tracking-widest text-fn-ink/60">{exercises.length} Movements</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 border border-white/5">
                <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
                <span className="text-[11px] font-black uppercase tracking-widest text-fn-ink/60">~{exercises.length * 8}m duration</span>
              </div>
            </div>
          </header>

          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-muted mb-4 block">Sequence Flow</h3>
            {exercises.map((ex, i) => (
              <div key={i} className="group relative overflow-hidden rounded-[2rem] border border-white/5 bg-white/[0.02] p-6 transition-all hover:bg-white/[0.05]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-[10px] font-black text-fn-muted">
                      {i + 1}
                    </span>
                    <div>
                      <h4 className="text-xl font-black text-white uppercase italic">{ex.name}</h4>
                      <p className="mt-0.5 text-xs font-bold text-fn-muted">{ex.sets} Sets · {ex.reps} Reps</p>
                    </div>
                  </div>
                  <div className="h-12 w-12 overflow-hidden rounded-xl bg-black/40">
                    <Image
                      src={getExerciseImageUrl(ex.name, ex.video_url || ex.image_url)}
                      alt={ex.name}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover opacity-50 transition-opacity group-hover:opacity-100"
                    />
                  </div>
                </div>
                {ex.intent && (
                  <p className="mt-4 text-[11px] font-medium leading-relaxed text-fn-ink/40 line-clamp-1 border-t border-white/5 pt-4">
                    {ex.intent}
                  </p>
                )}
              </div>
            ))}
          </section>

          <footer className="mt-12 rounded-3xl bg-fn-accent/5 border border-fn-accent/10 p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-fn-accent mb-2">Coach Note</p>
            <p className="text-sm font-medium leading-relaxed text-white/60">
              Focus on the &quot;Intent&quot; cues for each move. This session is designed to optimize movement quality under fatigue.
            </p>
          </footer>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-fn-bg via-fn-bg to-transparent px-6 pb-10 pt-12">
          <button
            type="button"
            onClick={startWorkout}
            className="group relative w-full overflow-hidden rounded-full bg-fn-accent py-5 text-lg font-black uppercase tracking-wider text-black shadow-[0_-10px_50px_rgba(10,217,196,0.2)] transition-all active:scale-[0.98] hover:bg-white"
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
            Initiate Experience
          </button>
        </div>
      </div>
    );
  }

  if (phase === "completed") {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-shell flex-col bg-fn-bg pt-20 px-6 text-center">
        <div className="flex flex-col items-center justify-center flex-1">
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-fn-accent opacity-20 blur-[100px]" />
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-fn-accent text-black shadow-[0_0_60px_rgba(10,217,196,0.5)] animate-in zoom-in duration-500">
              <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <h1 className="font-display text-5xl font-black italic tracking-tighter text-white uppercase leading-none mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            Session Transcended
          </h1>
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-fn-accent mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            {saved ? "Neural Data Synchronized" : saveError ?? "Intensity Captured"}
          </p>

          {(postWorkoutInsight || postWorkoutInsightLoading) && (
            <div className="w-full max-w-md rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-8 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-fn-accent mb-4">Neural Recalibration</p>
              {postWorkoutInsightLoading ? (
                <div className="space-y-3">
                  <div className="h-2 w-full rounded-full bg-white/5 animate-pulse" />
                  <div className="h-2 w-[80%] rounded-full bg-white/5 animate-pulse" />
                  <div className="h-2 w-[90%] rounded-full bg-white/5 animate-pulse" />
                </div>
              ) : (
                <p className="text-base font-medium italic leading-relaxed text-fn-ink/60">
                  {postWorkoutInsight}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="pb-12 pt-12">
          <Link href="/log/workout" className="block w-full">
            <button className="w-full rounded-full bg-white py-5 text-sm font-black uppercase tracking-widest text-black transition-all hover:bg-fn-accent hover:text-black hover:scale-[1.02] active:scale-[0.98]">
              Return to Nexus
            </button>
          </Link>
        </div>
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
            <button
              type="button"
              onClick={() => void swapCurrentExercise("pain or injury concern")}
              disabled={swapLoading}
              className="text-sm font-semibold text-fn-primary hover:underline disabled:opacity-60"
            >
              {swapLoading ? "Swapping..." : "Swap this move"}
            </button>
            <button type="button" onClick={() => setInjuryBannerDismissed(true)} className="text-sm font-semibold text-fn-muted hover:underline">
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col px-4 pb-6 pt-4">
        <header className="mb-8 flex items-center justify-between">
          <Link
            href="/log/workout"
            className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-fn-muted hover:bg-white/10 hover:text-white transition-colors"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            End
          </Link>
          <div className="flex flex-col items-end">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-accent leading-none mb-2 text-right">Neural Guidance</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`flex items-center justify-center p-1.5 rounded-full transition-colors border ${audioEnabled ? 'bg-fn-accent/20 border-fn-accent/30 text-fn-accent' : 'bg-white/5 border-white/5 text-fn-muted'}`}
              >
                {audioEnabled ? (
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" /></svg>
                ) : (
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                )}
              </button>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30 leading-none">
                {progressLabel}
              </span>
            </div>
          </div>
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
                {exercise.rationale && (
                  <p className="mt-2 text-xs font-medium text-white/60 line-clamp-1">
                    {exercise.rationale}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-4 shadow-xl backdrop-blur-md">
                <span className="text-[10px] font-black uppercase tracking-widest text-fn-muted mb-1 block">Target</span>
                <p className="text-2xl font-black text-white">{exercise.reps} reps</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-4 shadow-xl backdrop-blur-md">
                <span className="text-[10px] font-black uppercase tracking-widest text-fn-muted mb-1 block">Intensity</span>
                <p className="text-xl font-black text-fn-accent">{exercise.intensity}</p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-6 shadow-xl backdrop-blur-md overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-fn-accent">Expert Coaching</p>
                <button
                  onClick={() => setShowExpertCues(!showExpertCues)}
                  className="text-[10px] font-black uppercase tracking-widest text-fn-muted hover:text-white transition-colors"
                >
                  {showExpertCues ? "Less" : "Details"}
                </button>
              </div>

              <div className="space-y-4">
                {exercise.intent && (
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-fn-muted/70 block mb-1">Intent</span>
                    <p className="text-sm font-bold text-white leading-tight">{exercise.intent}</p>
                  </div>
                )}

                {showExpertCues && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
                    {exercise.tempo && (
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-fn-muted/70 block mb-1">Tempo</span>
                        <p className="text-xs font-bold text-white">{exercise.tempo}</p>
                      </div>
                    )}
                    {exercise.breathing && (
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-fn-muted/70 block mb-1">Breathing</span>
                        <p className="text-xs font-bold text-white">{exercise.breathing}</p>
                      </div>
                    )}
                  </div>
                )}

                {exercise.notes && (
                  <div className="mt-4 rounded-xl bg-black/40 p-4 border border-white/5">
                    <p className="text-sm font-medium leading-relaxed text-white/80">{exercise.notes}</p>
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-col gap-3">
                {!isSwapOptionsVisible ? (
                  <button
                    type="button"
                    onClick={() => setIsSwapOptionsVisible(true)}
                    disabled={swapLoading}
                    className="self-start rounded-xl border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-fn-accent transition-colors hover:bg-white/5 disabled:opacity-60"
                  >
                    {swapLoading ? "Swapping..." : "Swap Exercise"}
                  </button>
                ) : (
                  <div className="flex flex-col gap-3 p-4 rounded-xl border border-white/10 bg-black/40 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-fn-accent flex items-center justify-between">
                      Reason for Swap
                      <button onClick={() => setIsSwapOptionsVisible(false)} className="text-white/40 hover:text-white">✕</button>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => { setIsSwapOptionsVisible(false); void swapCurrentExercise("No equipment available"); }} className="rounded-lg bg-white/5 border border-white/5 px-3 py-2 text-[11px] font-bold text-white hover:bg-white/10 text-left transition-colors">No Equipment</button>
                      <button onClick={() => { setIsSwapOptionsVisible(false); void swapCurrentExercise("Too difficult for today"); }} className="rounded-lg bg-white/5 border border-white/5 px-3 py-2 text-[11px] font-bold text-white hover:bg-white/10 text-left transition-colors">Too Hard</button>
                      <button onClick={() => { setIsSwapOptionsVisible(false); void swapCurrentExercise("Pain or joint discomfort"); }} className="rounded-lg bg-white/5 border border-white/5 px-3 py-2 text-[11px] font-bold text-white hover:bg-white/10 text-left transition-colors">Pain / Discomfort</button>
                      <button onClick={() => { setIsSwapOptionsVisible(false); void swapCurrentExercise("Bored, need variety"); }} className="rounded-lg bg-white/5 border border-white/5 px-3 py-2 text-[11px] font-bold text-white hover:bg-white/10 text-left transition-colors">Need Variety</button>
                    </div>
                  </div>
                )}
                {swapFeedback && (
                  <p className="text-xs font-medium text-fn-muted animate-in fade-in">{swapFeedback}</p>
                )}
              </div>
            </div>

            <p className="mt-6 px-1 text-center text-[10px] font-bold uppercase tracking-widest text-fn-muted/50">
              {planTitle} · AI guidance is educational. Stop if pain worsens.
            </p>

            {/* Large gym-friendly actions */}
            <div className="mt-auto pt-6 pb-4">
              <button
                type="button"
                onClick={startRest}
                disabled={isPlayingAudio}
                className="w-full rounded-full bg-fn-accent py-5 text-lg font-black uppercase tracking-wider text-black shadow-[0_0_30px_rgba(10,217,196,0.3)] transition-transform active:scale-[0.98] hover:bg-white disabled:opacity-80"
              >
                {isPlayingAudio ? (
                  <div className="flex items-center justify-center gap-1">
                    <div className="w-1 h-3 bg-black animate-[ping_1s_ease-in-out_infinite]" />
                    <div className="w-1 h-5 bg-black animate-[ping_1s_ease-in-out_infinite_0.2s]" />
                    <div className="w-1 h-2 bg-black animate-[ping_1s_ease-in-out_infinite_0.4s]" />
                    <span className="ml-2 font-black italic">Coaching...</span>
                  </div>
                ) : (
                  "Log Set & Rest"
                )}
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

      {/* AI Coach Panel - Slide up */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 transform transition-transform duration-500 ease-out ${isCoachOpen ? "translate-y-0" : "translate-y-full"
          }`}
      >
        <div className="mx-auto max-w-shell h-[70vh] rounded-t-[3rem] border-t border-white/10 bg-black/90 p-8 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-accent">Live Expert Coaching</p>
              <h3 className="font-display text-3xl font-black italic uppercase text-white">Ask Nova</h3>
            </div>
            <button
              onClick={() => setIsCoachOpen(false)}
              className="rounded-full bg-white/5 p-3 text-fn-muted hover:bg-white/10 hover:text-white transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex flex-col h-[calc(100%-8rem)]">
            <div className="flex-1 overflow-y-auto space-y-6 mb-6 pr-2">
              {coachReply ? (
                <div className="rounded-3xl rounded-tl-none border border-fn-accent/20 bg-fn-accent/5 p-6 animate-in fade-in slide-in-from-left-4">
                  <p className="text-sm font-medium leading-relaxed text-white">{coachReply}</p>
                  <button
                    onClick={() => setCoachReply(null)}
                    className="mt-4 text-[10px] font-black uppercase tracking-widest text-fn-accent hover:underline"
                  >
                    Ask something else
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-fn-muted">Suggested for {exercise.name}</p>
                  {[
                    "How should my form look?",
                    "What if this feels too light?",
                    "I'm feeling discomfort in my joints",
                    "Explain the science of this move"
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => {
                        setCoachQuestion(q);
                        void askCoach();
                      }}
                      className="w-full text-left rounded-2xl border border-white/5 bg-white/5 p-4 text-xs font-bold text-white hover:bg-white/10 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              {coachLoading && (
                <div className="flex gap-2 p-6">
                  <div className="h-2 w-2 rounded-full bg-fn-accent animate-bounce" />
                  <div className="h-2 w-2 rounded-full bg-fn-accent animate-bounce [animation-delay:0.2s]" />
                  <div className="h-2 w-2 rounded-full bg-fn-accent animate-bounce [animation-delay:0.4s]" />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={coachQuestion}
                onChange={(e) => setCoachQuestion(e.target.value)}
                placeholder="Ask your AI trainer..."
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-white placeholder-white/30 focus:border-fn-accent/50 focus:outline-none transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && void askCoach()}
              />
              <button
                onClick={() => void askCoach()}
                disabled={coachLoading || !coachQuestion.trim()}
                className="rounded-2xl bg-fn-accent px-6 py-4 text-xs font-black uppercase tracking-widest text-black disabled:opacity-50"
              >
                Ask
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Ask Coach Button */}
      {phase === "work" && !isCoachOpen && (
        <button
          onClick={() => setIsCoachOpen(true)}
          className="fixed bottom-32 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-fn-accent text-black shadow-[0_0_30px_rgba(10,217,196,0.4)] transition-transform hover:scale-110 active:scale-95 animate-in fade-in zoom-in"
        >
          <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98 1 4.28L2 22l5.72-1c1.3.64 2.74 1 4.28 1 5.52 0 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z" />
          </svg>
        </button>
      )}
    </div>
  );
}
