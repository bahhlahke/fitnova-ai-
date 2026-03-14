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
import { SpotifyProvider, useSpotify } from "@/lib/music/SpotifyProvider";
import { SpotifyMiniPlayer } from "@/components/music/SpotifyMiniPlayer";
import { getWorkoutsPlaylists, spotifyFetch } from "@/lib/spotify";
import { ProBadge, type BadgeType } from "@/components/elite/ProBadge";

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
  cinema_video_url?: string | null;
};

const FALLBACK_EXERCISES: GuidedExercise[] = [
  { name: "Goblet Squat", sets: 3, reps: "10", intensity: "RPE 6-7" },
  { name: "Push-up", sets: 3, reps: "8-12", intensity: "RPE 7" },
  { name: "Dumbbell RDL", sets: 3, reps: "10", intensity: "RPE 7" },
];

export default function GuidedWorkoutPage() {
  return (
    <SpotifyProvider>
      <GuidedWorkoutScreen />
    </SpotifyProvider>
  );
}

function GuidedWorkoutScreen() {
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
  const [swapInput, setSwapInput] = useState("");

  // Synapse Pulse State
  const [showingPulseAnimation, setShowingPulseAnimation] = useState(false);
  const [pulseMessage, setPulseMessage] = useState("");

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isMusicPanelOpen, setIsMusicPanelOpen] = useState(false);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);
  const [musicNotice, setMusicNotice] = useState<string | null>(null);
  const [failedMediaUrls, setFailedMediaUrls] = useState<string[]>([]);
  const { setVolume, volume: spotifyVolume } = useSpotify();
  const workoutStartedAt = useRef<number | null>(null);

  // New State for Logging
  const [loggedSets, setLoggedSets] = useState<Array<{ weight?: number; reps?: number }>>([]);
  const [currentWeight, setCurrentWeight] = useState<string>("");
  const [currentReps, setCurrentReps] = useState<string>("");

  const markMediaFailed = useCallback((url: string | null | undefined) => {
    if (!url) return;
    setFailedMediaUrls((current) => (current.includes(url) ? current : [...current, url]));
  }, []);

  const playCoachAudio = useCallback(async (contextStr: string, metrics?: any) => {
    if (!audioEnabled) return;
    setAudioNotice(null);

    // Audio Ducking: Lower Spotify volume
    const originalVolume = spotifyVolume;
    await setVolume(0.15);

    // Stop anything currently playing
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();

    const restoreVolume = async () => {
      setIsPlayingAudio(false);
      await setVolume(originalVolume);
    };

    try {
      setIsPlayingAudio(true);
      const res = await fetch("/api/v1/coach/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: contextStr, metrics }),
      });

      const contentType = res.headers.get("content-type") ?? "";

      // ── Real OpenAI TTS path — binary audio/mpeg ─────────────────────────
      if (contentType.includes("audio")) {
        const arrayBuffer = await res.arrayBuffer();
        const audioCtx = new AudioContext();
        const decoded = await audioCtx.decodeAudioData(arrayBuffer);
        const source = audioCtx.createBufferSource();
        source.buffer = decoded;
        source.connect(audioCtx.destination);
        source.onended = () => {
          restoreVolume();
          audioCtx.close();
        };
        source.start(0);
        return;
      }

      // ── Fallback: browser SpeechSynthesis with improved voice ─────────────
      if (!("speechSynthesis" in window)) {
        setAudioNotice("Voice cues are unavailable on this device. Keep going with the on-screen coaching cues.");
        restoreVolume();
        return;
      }

      const data = await res.json();
      if (!res.ok || !data.script) {
        setAudioNotice("Voice cues are temporarily unavailable. Keep going with the on-screen coaching cues.");
        restoreVolume();
        return;
      }

      const speak = (voices: SpeechSynthesisVoice[]) => {
        const utterance = new SpeechSynthesisUtterance(data.script);
        // Prefer warmer/female voices in order of preference
        const preferred = voices.find(v =>
          v.lang.startsWith("en") && (
            v.name.includes("Samantha") ||
            v.name.includes("Karen") ||
            v.name.includes("Moira") ||
            v.name.includes("Tessa") ||
            v.name.includes("Victoria") ||
            v.name.includes("Zira") ||
            v.name.includes("Joanna") ||
            v.name.includes("female") ||
            v.name.toLowerCase().includes("female")
          )
        ) ?? voices.find(v => v.lang.startsWith("en-US")) ?? null;
        if (preferred) utterance.voice = preferred;
        utterance.rate = 1.08;
        utterance.pitch = 1.15;
        utterance.volume = 1.0;
        utterance.onend = () => restoreVolume();
        utterance.onerror = () => restoreVolume();
        window.speechSynthesis.speak(utterance);
      };

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        speak(voices);
      } else {
        // Chrome lazy-loads voices — wait for the event
        window.speechSynthesis.onvoiceschanged = () => {
          speak(window.speechSynthesis.getVoices());
        };
      }
    } catch (e) {
      console.error("Audio playback error:", e);
      setAudioNotice("Voice cues are temporarily unavailable. Keep going with the on-screen coaching cues.");
      restoreVolume();
    }
  }, [audioEnabled, setVolume, spotifyVolume]);

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
        const targetDate = typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("date") || toLocalDateString()) : toLocalDateString();

        const [planRes, profileRes, weeklyPlansRes] = await Promise.all([
          supabase
            .from("daily_plans")
            .select("plan_json")
            .eq("user_id", user.id)
            .eq("date_local", targetDate)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.from("user_profile").select("injuries_limitations").eq("user_id", user.id).maybeSingle(),
          supabase.from("weekly_plans").select("plan_json").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
        ]);

        let plan = (planRes.data?.plan_json ?? null) as DailyPlan | null;

        // Fallback to weekly plan if no specific daily plan exists
        if (!plan && weeklyPlansRes.data?.length) {
          for (const wp of weeklyPlansRes.data) {
            const days = wp.plan_json?.days || [];
            const targetDay = days.find((d: any) => d.date_local === targetDate);
            if (targetDay && targetDay.exercises?.length) {
              plan = {
                training_plan: {
                  focus: targetDay.focus,
                  intensity: targetDay.intensity,
                  exercises: targetDay.exercises,
                }
              } as unknown as DailyPlan;
              break;
            }
          }
        }
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
            cinema_video_url: e.cinema_video_url ?? null,
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

        // Pulse Subscription
        const channel = supabase.channel(`synapse_pulses_${user.id}`);
        channel.on("broadcast", { event: "pulse" }, (payload) => {
          const senderName = payload.payload?.sender_name;
          if (senderName) {
            setPulseMessage(`${senderName.toUpperCase()} SENT A PULSE!`);
            setShowingPulseAnimation(true);

            // Haptic (if supported on mobile web)
            if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
              window.navigator.vibrate(100);
            }

            setTimeout(() => {
              setShowingPulseAnimation(false);
            }, 3000);
          }
        }).subscribe();

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
    setSaveError(null);
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
      date: typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("date") || toLocalDateString()) : toLocalDateString(),
      workout_type: "strength" as const,
      exercises: exercises.map((e, index) => {
        // Collect logged sets for this exercise. If 3 sets, grab the next 3 from loggedSets based on prior set counts.
        const priorSets = exercises.slice(0, index).reduce((sum, ex) => sum + ex.sets, 0);
        const exLogs = loggedSets.slice(priorSets, priorSets + e.sets);

        // Use the highest weight logged for this exercise as the primary weight (as was the DB schema assumption)
        // Or store detailed logs in form_cues if we don't have a dedicated jsonb column yet.
        const maxWeight = exLogs.reduce((max, log) => (log.weight && log.weight > max ? log.weight : max), 0);
        const detailedLog = exLogs.map((l, i) => `Set ${i + 1}: ${l.weight || 0}kg x ${l.reps || 0}`).join("; ");

        return {
          name: e.name,
          sets: e.sets,
          reps: e.reps, // planned reps
          weight: maxWeight > 0 ? maxWeight : undefined,
          rest_seconds_after_set: 90,
          form_cues: e.notes ? `${e.notes} | Log: ${detailedLog}` : `Log: ${detailedLog}`,
        };
      }),
      duration_minutes: durationMinutes,
      notes: `Guided: ${planTitle}`,
    };

    const { error } = await supabase.from("workout_logs").insert(payload);

    if (error) {
      setSaveError(error.message);
      return;
    }
    setSaved(true);
    setSaveError(null);
    emitDataRefresh(["dashboard", "workout"]);
    // Trigger award check and PR calculation
    fetch("/api/v1/awards/check", { method: "POST" }).catch(() => { });
    fetch("/api/v1/analytics/process-prs", { method: "POST" }).catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setCurrentWeight("");
      setCurrentReps("");
    } else {
      setSetIndex((i) => i + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setSwapInput("");
        setIsSwapOptionsVisible(false);
        setInjuryBannerDismissed(true);
      } catch {
        setSwapFeedback("Substitution failed. Try again.");
      } finally {
        setSwapLoading(false);
      }
    },
    [exercise, exerciseIndex]
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachQuestion, exercise, setIndex]);

  const startRest = useCallback(() => {
    if (isLastSet && isLastExercise) {
      setPhase("completed");
      void persistWorkout();
      void playCoachAudio("finish_workout");
      return;
    }

    // Save current inputs to state
    const w = parseFloat(currentWeight);
    const r = parseInt(currentReps, 10);
    setLoggedSets(prev => {
      const newLogs = [...prev];
      newLogs.push({ weight: isNaN(w) ? undefined : w, reps: isNaN(r) ? parseInt(exercise?.reps || "10") : r });
      return newLogs;
    });

    setPhase("rest");
    setRestSeconds(90);
    void playCoachAudio("finish_set", { hrv: 85 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const startWorkout = useCallback(async () => {
    workoutStartedAt.current = Date.now();
    setPhase("work");
    setMusicNotice(null);
    void playCoachAudio("start_workout");

    // Auto-Play Workout Mix
    try {
      const playlists = await getWorkoutsPlaylists();
      const workoutPlaylist = playlists[0]; // Take the first matching workout playlist

      if (workoutPlaylist) {
        await spotifyFetch("/me/player/play", {
          method: "PUT",
          body: JSON.stringify({ context_uri: workoutPlaylist.uri })
        });
      }
    } catch (err) {
      console.error("Auto-play failed:", err);
      setMusicNotice("Spotify playback is unavailable right now. You can still finish the session with Koda's on-screen coaching.");
    }
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
                    {(() => {
                      const mediaUrl = getExerciseImageUrl(ex.name, ex.video_url || ex.image_url);
                      if (failedMediaUrls.includes(mediaUrl)) {
                        return (
                          <div className="flex h-full w-full items-center justify-center bg-white/5 text-lg">
                            <span>🏋️</span>
                          </div>
                        );
                      }
                      return isExerciseVideoUrl(mediaUrl) ? (
                        <video
                          src={mediaUrl}
                          muted
                          autoPlay
                          loop
                          playsInline
                          className="h-full w-full object-cover opacity-50 transition-opacity group-hover:opacity-100"
                          onError={() => markMediaFailed(mediaUrl)}
                        />
                      ) : (
                        <Image
                          src={mediaUrl}
                          alt={ex.name}
                          width={48}
                          height={48}
                          className="h-full w-full object-cover opacity-50 transition-opacity group-hover:opacity-100"
                          unoptimized={isExerciseGifUrl(mediaUrl)}
                          onError={() => markMediaFailed(mediaUrl)}
                        />
                      );
                    })()}
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
          <div className="relative mb-12 flex flex-col items-center">
            <div className="absolute inset-0 bg-fn-accent opacity-20 blur-[100px]" />
            <ProBadge
              type={
                planTitle.toLowerCase().includes("mobility") ? "shadow" :
                  planTitle.toLowerCase().includes("fat-loss") ? "infinite" :
                    planTitle.toLowerCase().includes("strength") ? "iron_core" : "architect"
              }
              label="Elite Attainment"
              size="lg"
              className="animate-in zoom-in duration-1000"
            />
          </div>

          <h1 className="font-display text-5xl font-black italic tracking-tighter text-white uppercase leading-none mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            Session Transcended
          </h1>
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-fn-accent mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            {saved ? "Neural Data Synchronized" : saveError ?? "Intensity Captured"}
          </p>

          {!saved && saveError && (
            <p className="max-w-md text-sm leading-relaxed text-white/60 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
              Your session is complete, but we could not save the workout yet. Retry once before leaving so your dashboard and progression stay accurate.
            </p>
          )}

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

        <div className="space-y-3 pb-12 pt-12">
          {!saved && (
            <button
              type="button"
              onClick={() => void persistWorkout()}
              className="w-full rounded-full border border-fn-accent/20 bg-fn-accent/10 py-4 text-sm font-black uppercase tracking-widest text-fn-accent transition-all hover:bg-fn-accent/20"
            >
              Retry Save Workout
            </button>
          )}
          <Link href="/log/workout" className="block w-full">
            <button className="w-full rounded-full bg-white py-5 text-sm font-black uppercase tracking-widest text-black transition-all hover:bg-fn-accent hover:text-black hover:scale-[1.02] active:scale-[0.98]">
              {saved ? "Return to Nexus" : "Continue to Workout Log"}
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

  const imageUrl = getExerciseImageUrl(exercise.name, exercise.cinema_video_url || exercise.video_url || exercise.image_url);
  const showMotionFallback = failedMediaUrls.includes(imageUrl);
  const progressLabel = `Move ${exerciseIndex + 1}/${totalExercises} · Set ${setIndex + 1}/${totalSets}`;

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-shell flex-col bg-fn-bg px-0 py-0">
      {/* Progress bar - fixed at top for gym use */}
      <div className="fixed top-0 inset-x-0 z-50 h-1.5 w-full bg-fn-border/50 backdrop-blur-md">
        <div
          className="h-full bg-fn-primary shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {injuryBanner && !injuryBannerDismissed && (
        <div className="fixed top-4 inset-x-4 z-50 rounded-xl border border-amber-200/50 bg-amber-500/10 backdrop-blur-xl px-4 py-3 text-sm text-white shadow-2xl">
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

      {/* Optional: Add Full Screen Video Background for 'work' and 'rest' phases */}
      {(phase === "work" || phase === "rest") && (
        <div className="fixed inset-0 z-0 bg-black">
          {showMotionFallback ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(10,217,196,0.14),_transparent_55%)] px-6">
              <div className="max-w-sm rounded-3xl border border-white/10 bg-black/55 p-6 text-center shadow-2xl backdrop-blur-md">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-accent">Movement Cues Active</p>
                <p className="mt-3 text-sm leading-relaxed text-white/70">
                  Demo media is unavailable for this move right now. Use the exercise name, reps, and coaching cues below to keep the session moving.
                </p>
              </div>
            </div>
          ) : isExerciseVideoUrl(imageUrl) ? (
            <video
              src={imageUrl}
              className="absolute inset-0 h-full w-full object-cover opacity-40 transition-opacity duration-1000"
              loop
              muted
              autoPlay
              playsInline
              onError={() => markMediaFailed(imageUrl)}
            />
          ) : (
            <Image
              src={imageUrl}
              alt={exercise.name}
              fill
              className="object-cover opacity-40 transition-opacity duration-1000"
              unoptimized={isExerciseGifUrl(imageUrl)}
              onError={() => markMediaFailed(imageUrl)}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
        </div>
      )}

      {/* Synapse Pulse Overlay */}
      {showingPulseAnimation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="flex flex-col items-center animate-in zoom-in-50 duration-500">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-fn-accent opacity-50 blur-[50px] rounded-full animate-pulse" />
              <svg
                className="relative h-40 w-40 text-fn-accent drop-shadow-[0_0_30px_rgba(10,217,196,0.8)]"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <h2 className="font-display text-4xl font-black italic uppercase text-white drop-shadow-2xl text-center px-4 tracking-tight">
              {pulseMessage}
            </h2>
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-1 flex-col px-4 pb-6 pt-8">
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
                onClick={() => setIsMusicPanelOpen(!isMusicPanelOpen)}
                className={`flex items-center justify-center p-1.5 rounded-full transition-colors border ${isMusicPanelOpen ? 'bg-fn-accent/20 border-fn-accent/30 text-fn-accent' : 'bg-white/5 border-white/5 text-fn-muted'}`}
              >
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 1.12-3 2.5S3.343 19 5 19s3-1.12 3-2.5V8.55l8-1.6v6.164A4.369 4.369 0 0015 13c-1.657 0-3 1.12-3 2.5s1.343 2.5 3 2.5 3-1.12 3-2.5V3z" /></svg>
              </button>
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

        {(audioNotice || musicNotice) && (
          <div className="mb-4 space-y-2">
            {audioNotice && (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-[11px] font-medium leading-relaxed text-amber-100">
                {audioNotice}
              </div>
            )}
            {musicNotice && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[11px] font-medium leading-relaxed text-white/70">
                {musicNotice}
              </div>
            )}
          </div>
        )}

        {isMusicPanelOpen && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <SpotifyMiniPlayer />
          </div>
        )}

        {phase === "work" && (
          <div className="flex flex-col flex-1 pb-6 mt-10">
            {/* Header Data */}
            <div className="text-center mb-auto mt-4">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-fn-accent mb-2">Set {setIndex + 1} of {totalSets}</p>
              <h2 className="font-display text-5xl sm:text-6xl font-black italic tracking-tighter text-white uppercase drop-shadow-2xl">
                {exercise.name}
              </h2>
              {exercise.notes && (
                <div className="mt-4 mx-auto max-w-sm rounded-2xl bg-black/40 backdrop-blur-md p-4 border border-white/10 shadow-2xl">
                  <p className="text-sm font-medium leading-relaxed text-white text-center">&quot;{exercise.notes}&quot;</p>
                </div>
              )}
            </div>

            {/* Target Display and Coaching Details */}
            <div className="grid grid-cols-2 gap-4 mt-8 mb-6">
              <div className="rounded-[2rem] border border-white/10 bg-black/40 p-5 shadow-2xl backdrop-blur-xl text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-fn-muted mb-2 block">Planned Reps</span>
                <p className="text-3xl font-black text-white">{exercise.reps}</p>
              </div>
              <div className="rounded-[2rem] border border-white/10 bg-black/40 p-5 shadow-2xl backdrop-blur-xl text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-fn-muted mb-2 block">Intensity Target</span>
                <p className="text-2xl font-black text-fn-accent mt-1">{exercise.intensity}</p>
              </div>
            </div>

            {/* Live Input Form for Weight/Reps */}
            <div className="rounded-[2.5rem] border border-white/15 bg-black/60 p-6 shadow-2xl backdrop-blur-2xl mb-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Log This Set</p>
                {/* Simulated Previous History Data point */}
                <p className="text-[10px] font-black uppercase tracking-widest text-fn-accent">Focus & Execute</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black uppercase tracking-widest text-fn-muted">Weight</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={currentWeight}
                    onChange={(e) => setCurrentWeight(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-2xl border-2 border-white/10 bg-white/5 py-4 pl-20 pr-4 text-right text-2xl font-black text-white focus:border-fn-accent focus:outline-none transition-colors"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black uppercase tracking-widest text-fn-muted">Reps</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={currentReps}
                    onChange={(e) => setCurrentReps(e.target.value)}
                    placeholder={exercise.reps.split("-")[0] || "0"}
                    className="w-full rounded-2xl border-2 border-white/10 bg-white/5 py-4 pl-16 pr-4 text-right text-2xl font-black text-white focus:border-fn-accent focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Large gym-friendly actions */}
            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={startRest}
                disabled={isPlayingAudio}
                className="w-full max-w-sm mx-auto rounded-[2rem] bg-fn-accent py-6 text-xl font-black uppercase tracking-wider text-black shadow-[0_0_40px_rgba(10,217,196,0.3)] transition-transform active:scale-[0.98] hover:bg-white disabled:opacity-80 disabled:scale-100"
              >
                {isPlayingAudio ? (
                  <div className="flex items-center justify-center gap-1">
                    <div className="w-1.5 h-4 bg-black rounded-full animate-[pulse_1s_ease-in-out_infinite]" />
                    <div className="w-1.5 h-6 bg-black rounded-full animate-[pulse_1s_ease-in-out_infinite_0.2s]" />
                    <div className="w-1.5 h-3 bg-black rounded-full animate-[pulse_1s_ease-in-out_infinite_0.4s]" />
                    <span className="ml-3 font-black italic tracking-widest">Coaching...</span>
                  </div>
                ) : (
                  "Log Set"
                )}
              </button>
            </div>

            <div className="mt-6 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSwapOptionsVisible(true)}
                className="text-[10px] font-black uppercase tracking-widest text-fn-accent/70 hover:text-fn-accent transition-colors"
              >
                AI Override / Swap
              </button>
              {swapFeedback && (
                <p className="text-[10px] text-emerald-400 font-mono text-center max-w-sm">System: {swapFeedback}</p>
              )}
            </div>

            {isSwapOptionsVisible && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md">
                <div className="w-full max-w-sm flex flex-col gap-4 p-6 rounded-[2rem] border border-fn-accent/20 bg-fn-surface shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-accent flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fn-accent opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-fn-accent"></span>
                      </span>
                      Neural Override
                    </p>
                    <button onClick={() => setIsSwapOptionsVisible(false)} className="text-white/40 hover:text-white p-2">✕</button>
                  </div>

                  <p className="text-sm font-medium text-fn-muted italic">How should Koda adapt this movement?</p>

                  <div className="relative flex items-center group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-fn-accent font-mono font-bold">{">"}</span>
                    </div>
                    <input
                      type="text"
                      value={swapInput}
                      onChange={(e) => setSwapInput(e.target.value)}
                      placeholder="e.g. 'I only have dumbbells'"
                      className="w-full bg-black/60 border border-white/10 text-white placeholder:text-white/30 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-fn-accent focus:border-fn-accent rounded-xl py-4 pl-10 pr-20 transition-all"
                      disabled={swapLoading}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && swapInput.trim() && !swapLoading) {
                          void swapCurrentExercise(swapInput);
                        }
                      }}
                    />
                    <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                      <button
                        onClick={() => void swapCurrentExercise(swapInput)}
                        disabled={swapLoading || !swapInput.trim()}
                        className="bg-fn-accent/10 hover:bg-fn-accent/20 text-fn-accent border border-fn-accent/20 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                      >
                        {swapLoading ? "..." : "EXE"}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {["No Equipment", "Too Hard", "Knee Pain"].map(quickAction => (
                      <button
                        key={quickAction}
                        onClick={() => setSwapInput(quickAction)}
                        className="bg-white/5 hover:bg-white/10 border border-white/5 rounded px-2 py-1 text-[9px] font-bold text-white/60 uppercase tracking-widest transition-colors"
                      >
                        {quickAction}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {phase === "rest" && (
          <div className="flex flex-1 flex-col items-center justify-center text-center p-6 relative z-10">
            <div className="relative flex items-center justify-center w-72 h-72 mb-10 mt-10 drop-shadow-2xl">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle cx="144" cy="144" r="136" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/10" />
                <circle cx="144" cy="144" r="136" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={854} strokeDashoffset={854 - (854 * (restSeconds / 90))} className="text-fn-accent transition-all duration-1000 ease-linear shadow-[0_0_30px_rgba(10,217,196,0.5)]" />
              </svg>
              <div className="flex flex-col items-center">
                <span className="text-xs font-black uppercase tracking-[0.4em] text-white/50 mb-2">Rest Phase</span>
                <p className="font-display text-8xl font-black italic tracking-tighter text-white tabular-nums drop-shadow-lg">
                  {restSeconds}
                </p>
                <span className="text-sm font-bold text-fn-accent uppercase tracking-widest mt-2">seconds</span>
              </div>
            </div>

            <div className="mb-auto rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 p-8 shadow-2xl w-full max-w-sm mx-auto">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-accent mb-3 block">Preparing Next Set</p>
              <p className="text-3xl font-black text-white italic uppercase drop-shadow-md">
                {exercise.name}
              </p>
              <div className="mt-4 flex justify-between items-center border-t border-white/10 pt-4">
                <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Set {setIndex + 2} of {totalSets}</span>
                <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Target: {exercise.reps} Reps</span>
              </div>
            </div>

            <button
              type="button"
              onClick={nextSet}
              className={`w-full max-w-sm mx-auto mt-8 rounded-[2.5rem] py-6 text-sm font-black uppercase tracking-[0.2em] transition-all duration-300 ${restSeconds <= 10
                ? "bg-fn-accent text-black shadow-[0_0_40px_rgba(10,217,196,0.3)] hover:bg-white hover:scale-105 active:scale-95"
                : "bg-black/60 border border-white/10 text-white backdrop-blur-md hover:bg-white/10 hover:border-white/20 active:scale-95"
                }`}
            >
              Skip Rest Interval
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
