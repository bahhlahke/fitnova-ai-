"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toLocalDateString } from "@/lib/date/local-date";
import type { DailyPlan, DailyPlanTrainingExercise } from "@/lib/plan/types";
import {
  getExerciseImageUrl,
  isExerciseGifUrl,
  isExerciseVideoUrl,
} from "@/lib/workout/exercise-images";
import { normalizeGuidedExercise } from "@/lib/workout/guided-session";
import {
  getExerciseRestSeconds,
  getNumericRepPlaceholder,
  parseTimedWorkSeconds,
} from "@/lib/workout/guided-metrics";
import { Button } from "@/components/ui";
import { emitDataRefresh } from "@/lib/ui/data-sync";
import { SpotifyProvider, useSpotify } from "@/lib/music/SpotifyProvider";
import { SpotifyMiniPlayer } from "@/components/music/SpotifyMiniPlayer";
import { getWorkoutsPlaylists, spotifyFetch } from "@/lib/spotify";
import { ProBadge } from "@/components/elite/ProBadge";

type GuidedExercise = DailyPlanTrainingExercise;

type CoachAudioDetails = {
  name: string;
  reps: string;
  intensity: string;
  tempo?: string;
  breathing?: string;
  intent?: string;
  notes?: string;
  rationale?: string;
  walkthrough_steps?: string[];
  coaching_points?: string[];
  setup_checklist?: string[];
  common_mistakes?: string[];
  rest_seconds_after_set?: number | null;
  setIndex: number;
  totalSets: number;
  focus?: string;
};

function toGuidedExercise(
  exercise: Partial<GuidedExercise> & {
    name?: string;
    sets?: number;
    reps?: string | number;
    intensity?: string | null;
  }
): GuidedExercise {
  return normalizeGuidedExercise({
    name: typeof exercise.name === "string" && exercise.name.trim() ? exercise.name : "Movement",
    sets: Number(exercise.sets) > 0 ? Number(exercise.sets) : 1,
    reps: typeof exercise.reps === "string" ? exercise.reps : String(exercise.reps ?? "8-10"),
    intensity:
      typeof exercise.intensity === "string" && exercise.intensity.trim()
        ? exercise.intensity
        : "RPE 7",
    notes: typeof exercise.notes === "string" ? exercise.notes : undefined,
    tempo: typeof exercise.tempo === "string" ? exercise.tempo : undefined,
    breathing: typeof exercise.breathing === "string" ? exercise.breathing : undefined,
    intent: typeof exercise.intent === "string" ? exercise.intent : undefined,
    rationale: typeof exercise.rationale === "string" ? exercise.rationale : undefined,
    walkthrough_steps: Array.isArray(exercise.walkthrough_steps)
      ? exercise.walkthrough_steps.filter((step): step is string => typeof step === "string" && step.trim().length > 0)
      : undefined,
    coaching_points: Array.isArray(exercise.coaching_points)
      ? exercise.coaching_points.filter((point): point is string => typeof point === "string" && point.trim().length > 0)
      : undefined,
    setup_checklist: Array.isArray(exercise.setup_checklist)
      ? exercise.setup_checklist.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : undefined,
    common_mistakes: Array.isArray(exercise.common_mistakes)
      ? exercise.common_mistakes.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : undefined,
    target_load_kg:
      typeof exercise.target_load_kg === "number" && Number.isFinite(exercise.target_load_kg)
        ? exercise.target_load_kg
        : undefined,
    target_rir:
      typeof exercise.target_rir === "number" && Number.isFinite(exercise.target_rir)
        ? exercise.target_rir
        : undefined,
    rest_seconds_after_set:
      typeof exercise.rest_seconds_after_set === "number" && Number.isFinite(exercise.rest_seconds_after_set)
        ? exercise.rest_seconds_after_set
        : undefined,
    progression_note:
      typeof exercise.progression_note === "string" ? exercise.progression_note : undefined,
    image_url: typeof exercise.image_url === "string" ? exercise.image_url : null,
    video_url: typeof exercise.video_url === "string" ? exercise.video_url : null,
    cinema_video_url:
      typeof exercise.cinema_video_url === "string" ? exercise.cinema_video_url : null,
  });
}

function buildCoachAudioDetails(
  exercise: GuidedExercise,
  setNumber: number,
  focus?: string,
): CoachAudioDetails {
  return {
    name: exercise.name,
    reps: exercise.reps,
    intensity: exercise.intensity,
    tempo: exercise.tempo,
    breathing: exercise.breathing,
    intent: exercise.intent,
    notes: exercise.notes,
    rationale: exercise.rationale,
    walkthrough_steps: exercise.walkthrough_steps,
    coaching_points: exercise.coaching_points,
    setup_checklist: exercise.setup_checklist,
    common_mistakes: exercise.common_mistakes,
    rest_seconds_after_set: getExerciseRestSeconds(exercise),
    setIndex: setNumber,
    totalSets: exercise.sets,
    focus,
  };
}

function mapWeeklyIntensityToTarget(intensity?: string): string {
  if (intensity === "high") return "RPE 8";
  if (intensity === "low") return "RPE 6";
  return "RPE 7";
}

function formatCountdown(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

const FALLBACK_EXERCISES: GuidedExercise[] = [
  toGuidedExercise({ name: "Goblet Squat", sets: 3, reps: "10", intensity: "RPE 6-7" }),
  toGuidedExercise({ name: "Push-up", sets: 3, reps: "8-12", intensity: "RPE 7" }),
  toGuidedExercise({ name: "Dumbbell RDL", sets: 3, reps: "10", intensity: "RPE 7" }),
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
  const [workSecondsRemaining, setWorkSecondsRemaining] = useState<number | null>(null);
  const [isWorkTimerRunning, setIsWorkTimerRunning] = useState(false);

  const [fullscreenDemo, setFullscreenDemo] = useState<{ url: string; name: string } | null>(null);

  // Priority 1 & 2 — coaching data surfaced in the rest phase
  const [restFormCue, setRestFormCue] = useState<string | null>(null);
  const [restFatigueAlert, setRestFatigueAlert] = useState<{ message: string; suggestion: string } | null>(null);

  const markMediaFailed = useCallback((url: string | null | undefined) => {
    if (!url) return;
    setFailedMediaUrls((current) => (current.includes(url) ? current : [...current, url]));
  }, []);

  const playCoachAudio = useCallback(async (
    contextStr: string,
    metrics?: Record<string, unknown>,
    details?: CoachAudioDetails,
  ) => {
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
        body: JSON.stringify({ context: contextStr, metrics, details }),
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
                  duration_minutes: targetDay.target_duration_minutes ?? 45,
                  location_option: "gym",
                  alternatives: [],
                  exercises: targetDay.exercises.map((entry: any) => ({
                    name: entry.name,
                    sets: entry.sets,
                    reps: entry.reps,
                    intensity: mapWeeklyIntensityToTarget(targetDay.intensity),
                    notes: entry.coaching_cue,
                    intent: entry.coaching_cue,
                  })),
                }
              } as unknown as DailyPlan;
              break;
            }
          }
        }
        if (plan?.training_plan?.exercises?.length) {
          setPlanTitle(plan.training_plan.focus || "Personalized session");
          const newExercises = plan.training_plan.exercises.map((exercise) =>
            toGuidedExercise(exercise)
          );
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
  const currentExerciseLogStart = exercises
    .slice(0, exerciseIndex)
    .reduce((sum, currentExercise) => sum + currentExercise.sets, 0);
  const currentExerciseLogs = loggedSets.slice(currentExerciseLogStart, currentExerciseLogStart + setIndex);
  const timedWorkSeconds = parseTimedWorkSeconds(exercise?.reps);

  useEffect(() => {
    setIsWorkTimerRunning(false);
    setWorkSecondsRemaining(timedWorkSeconds);
  }, [exerciseIndex, setIndex, timedWorkSeconds]);

  useEffect(() => {
    if (phase !== "work") {
      setIsWorkTimerRunning(false);
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "work" || !isWorkTimerRunning || workSecondsRemaining == null) return;
    if (workSecondsRemaining <= 0) {
      setIsWorkTimerRunning(false);
      if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate([150, 80, 150]);
      }
      return;
    }
    const timer = window.setTimeout(() => {
      setWorkSecondsRemaining((current) => (current == null ? current : current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [phase, isWorkTimerRunning, workSecondsRemaining]);

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
          rest_seconds_after_set: getExerciseRestSeconds(e),
          form_cues: [e.notes, e.progression_note, detailedLog ? `Log: ${detailedLog}` : null]
            .filter(Boolean)
            .join(" | "),
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
  }, [exercises, loggedSets, planTitle]);

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
      void playCoachAudio("finish_workout", undefined, exercise ? buildCoachAudioDetails(exercise, setIndex + 1, planTitle) : undefined);
      return;
    }

    const nextExerciseIndex = isLastSet ? exerciseIndex + 1 : exerciseIndex;
    const nextSetIndex = isLastSet ? 0 : setIndex + 1;
    const nextExercise = exercises[nextExerciseIndex] ?? exercise;

    setPhase("work");
    if (isLastSet) {
      setExerciseIndex((i) => i + 1);
      setSetIndex(0);
      setCurrentWeight("");
      setCurrentReps("");
    } else {
      setSetIndex((i) => i + 1);
    }
    if (nextExercise) {
      void playCoachAudio(
        "start_set",
        undefined,
        buildCoachAudioDetails(nextExercise, nextSetIndex + 1, planTitle)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise, exerciseIndex, exercises, isLastExercise, isLastSet, persistWorkout, planTitle, playCoachAudio, setIndex]);

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
              ? toGuidedExercise({
                ...entry,
                ...body.replacement,
              })
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

  const askCoach = useCallback(async (prompt?: string) => {
    const question = (prompt ?? coachQuestion).trim();
    if (!question || !exercise) return;
    setCoachLoading(true);
    setCoachReply(null);
    try {
      const res = await fetch("/api/v1/ai/workout-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          exercise: exercise.name,
          context: {
            set: setIndex + 1,
            totalSets: exercise.sets,
            intensity: exercise.intensity,
            reps: exercise.reps,
            tempo: exercise.tempo,
            breathing: exercise.breathing,
            intent: exercise.intent,
            rationale: exercise.rationale,
            walkthrough_steps: exercise.walkthrough_steps,
            coaching_points: exercise.coaching_points,
            setup_checklist: exercise.setup_checklist,
            common_mistakes: exercise.common_mistakes,
            rest_seconds_after_set: getExerciseRestSeconds(exercise),
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
      void playCoachAudio("finish_workout", undefined, exercise ? buildCoachAudioDetails(exercise, setIndex + 1, planTitle) : undefined);
      return;
    }

    // Save current inputs to state
    const w = parseFloat(currentWeight);
    const r = parseInt(currentReps, 10);
    const plannedReps = parseInt(getNumericRepPlaceholder(exercise?.reps), 10);
    setLoggedSets(prev => {
      const newLogs = [...prev];
      newLogs.push({
        weight: Number.isNaN(w) ? undefined : w,
        reps: Number.isNaN(r) ? (Number.isNaN(plannedReps) ? undefined : plannedReps) : r,
      });
      return newLogs;
    });

    // Priority 1 — surface the top coaching cue for the next set
    setRestFormCue(
      exercise?.coaching_points?.[0] ?? exercise?.common_mistakes?.[0] ?? null
    );

    // Priority 2 — fatigue detection: compare logged reps across sets
    const parsedReps = parseInt(currentReps, 10);
    const justLoggedReps = Number.isNaN(parsedReps) ? null : parsedReps;
    const priorReps = loggedSets.map(s => s.reps).filter((r): r is number => r != null);
    const allReps = justLoggedReps != null ? [...priorReps, justLoggedReps] : priorReps;
    if (allReps.length >= 2) {
      const peak = Math.max(...allReps);
      const latest = allReps[allReps.length - 1];
      const dropPct = peak > 0 ? Math.round(((peak - latest) / peak) * 100) : 0;
      if (dropPct >= 20) {
        setRestFatigueAlert({
          message: `Reps dropped ${dropPct}% from your peak — fatigue signal detected.`,
          suggestion: dropPct >= 35
            ? "Reduce load by ~10% or take an extra 30s before the next set."
            : "Take your full rest. You're still in the session.",
        });
      } else {
        setRestFatigueAlert(null);
      }
    } else {
      setRestFatigueAlert(null);
    }

    setPhase("rest");
    setRestSeconds(exercise ? getExerciseRestSeconds(exercise) : 60);
    setIsWorkTimerRunning(false);
    void playCoachAudio(
      "finish_set",
      { hrv: 85 },
      exercise ? buildCoachAudioDetails(exercise, setIndex + 1, planTitle) : undefined
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentReps, currentWeight, exercise, isLastExercise, isLastSet, persistWorkout, playCoachAudio, planTitle, setIndex]);

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
    if (exercise) {
      void playCoachAudio(
        "start_workout",
        undefined,
        buildCoachAudioDetails(exercise, 1, planTitle)
      );
    }

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
  }, [exercise, planTitle, playCoachAudio]);

  if (phase === "loading") {
    return (
      <div className="premium-grid-bg mx-auto flex min-h-[100dvh] max-w-shell flex-col items-center justify-center bg-fn-bg px-6 text-center">
        <div className="h-12 w-12 rounded-full border-2 border-fn-accent/20 border-t-fn-accent animate-spin mb-4" />
        <p className="premium-kicker">Guided Session Setup</p>
        <p className="mt-2 text-sm font-medium text-fn-ink/50">Preparing your trainer walkthrough, timers, and logging flow.</p>
      </div>
    );
  }

  if (phase === "overview") {
    return (
      <div className="premium-grid-bg mx-auto flex min-h-[100dvh] max-w-shell flex-col bg-fn-bg">
        <div className="flex-1 overflow-y-auto px-6 py-10 pb-56">
          <header className="premium-panel mb-8 p-6 sm:p-8">
            <Link href="/log/workout" className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-fn-muted transition-colors hover:text-white">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Exit
            </Link>
            <p className="premium-kicker mb-2">Session Overview</p>
            <h1 className="premium-headline text-4xl leading-none sm:text-5xl">
              {planTitle}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65">
              You&apos;re getting a trainer-grade experience with demo media, setup checklists, walkthrough cues, logging, and automated rest timing.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <div className="premium-badge">
                <span className="mr-2 h-1.5 w-1.5 rounded-full bg-fn-accent" />
                {exercises.length} movements
              </div>
              <div className="premium-badge">
                <span className="mr-2 h-1.5 w-1.5 rounded-full bg-white/50" />
                ~{exercises.length * 8} min
              </div>
              <div className="premium-badge">
                <span className="mr-2 h-1.5 w-1.5 rounded-full bg-fn-accent" />
                video + audio cues
              </div>
            </div>
          </header>

          <section className="space-y-4">
            <h3 className="mb-4 block text-[10px] font-semibold uppercase tracking-[0.22em] text-fn-muted">Session Sequence</h3>
            {exercises.map((ex, i) => (
              <div key={i} className="premium-panel-soft group relative overflow-hidden p-6 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[10px] font-semibold text-fn-muted">
                      {i + 1}
                    </span>
                    <div>
                      <h4 className="text-xl font-black italic tracking-tight text-white">{ex.name}</h4>
                      <p className="mt-0.5 text-xs font-semibold text-fn-muted">{ex.sets} sets · {ex.reps} target</p>
                    </div>
                  </div>
                  {(() => {
                    const mediaUrl = getExerciseImageUrl(ex.name, ex.video_url || ex.image_url);
                    if (failedMediaUrls.includes(mediaUrl)) return null;
                    return (
                      <button
                        type="button"
                        onClick={() => setFullscreenDemo({ url: mediaUrl, name: ex.name })}
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-fn-accent/30 bg-white/[0.06] text-fn-accent transition-all hover:bg-fn-accent/10 active:scale-95"
                        title="View exercise demo"
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </button>
                    );
                  })()}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-white/5 pt-4">
                  <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">
                    Rest {getExerciseRestSeconds(ex)}s
                  </span>
                  {ex.tempo && (
                    <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">
                      Tempo {ex.tempo}
                    </span>
                  )}
                  {typeof ex.target_rir === "number" && (
                    <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">
                      {ex.target_rir} RIR
                    </span>
                  )}
                  {typeof ex.target_load_kg === "number" && (
                    <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">
                      {Math.round(ex.target_load_kg * 10) / 10} kg
                    </span>
                  )}
                </div>
                <div className="mt-4 space-y-2">
                  {(ex.walkthrough_steps ?? []).slice(0, 2).map((step) => (
                    <p
                      key={step}
                      className="text-[11px] font-medium leading-relaxed text-fn-ink/50"
                    >
                      {step}
                    </p>
                  ))}
                  {ex.progression_note && (
                    <p className="text-[11px] font-medium leading-relaxed text-fn-accent/90">
                      Next time: {ex.progression_note}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </section>

          <footer className="premium-panel mt-10 p-6">
            <p className="premium-kicker mb-2">Coach Note</p>
            <p className="text-sm font-medium leading-relaxed text-white/60">
              Every movement below is loaded with a demo loop, setup checklist, and live coaching cues. Once the session starts, Koda will carry the exact same plan into the guided flow with countdowns, logging, and recovery timing already set.
            </p>
          </footer>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-[110] bg-gradient-to-t from-fn-bg via-fn-bg to-transparent px-6 pb-[max(5rem,env(safe-area-inset-bottom,5rem))] pt-12">
          <button
            type="button"
            onClick={startWorkout}
            className="group relative w-full overflow-hidden rounded-full bg-fn-accent py-5 text-lg font-black uppercase tracking-[0.2em] text-black shadow-[0_-10px_50px_rgba(10,217,196,0.22)] transition-all active:scale-[0.98] hover:bg-white"
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
            Start Guided Session
          </button>
        </div>

      {/* Fullscreen Exercise Demo Modal */}
      {fullscreenDemo && (
        <div className="fixed inset-0 z-[500] bg-black animate-in fade-in duration-200">
          {isExerciseVideoUrl(fullscreenDemo.url) ? (
            <video
              src={fullscreenDemo.url}
              className="absolute inset-0 h-full w-full object-contain"
              loop
              muted
              autoPlay
              playsInline
            />
          ) : (
            <Image
              src={fullscreenDemo.url}
              alt={fullscreenDemo.name}
              fill
              className="object-contain"
              unoptimized={isExerciseGifUrl(fullscreenDemo.url)}
            />
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/50 to-transparent px-6 pb-12 pt-24">
            <p className="text-center text-2xl font-black italic uppercase tracking-tight text-white drop-shadow-2xl">
              {fullscreenDemo.name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFullscreenDemo(null)}
            className="absolute right-5 top-12 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-white/10"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      </div>
    );
  }

  if (phase === "completed") {
    return (
      <div className="premium-grid-bg mx-auto flex min-h-[100dvh] max-w-shell flex-col bg-fn-bg px-6 pt-20 text-center">
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

          <h1 className="premium-headline mb-4 animate-in fade-in slide-in-from-bottom-4 text-5xl leading-none duration-700">
            Session Complete
          </h1>
          <p className="mb-8 text-sm font-semibold uppercase tracking-[0.22em] text-fn-accent animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            {saved ? "Session Saved" : saveError ?? "Session Captured"}
          </p>

          {!saved && saveError && (
            <p className="max-w-md text-sm leading-relaxed text-white/65 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
              Your session is complete, but we could not save the workout yet. Retry once before leaving so your dashboard and progression stay accurate.
            </p>
          )}

          {(postWorkoutInsight || postWorkoutInsightLoading) && (
            <div className="premium-panel w-full max-w-md animate-in fade-in slide-in-from-bottom-8 p-8 duration-1000 delay-300">
              <p className="premium-kicker mb-4">Coach Debrief</p>
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
              className="w-full rounded-full border border-fn-accent/20 bg-fn-accent/10 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-fn-accent transition-all hover:bg-fn-accent/20"
            >
              Retry Save Workout
            </button>
          )}
          <Link href="/log/workout" className="block w-full">
            <button className="w-full rounded-full bg-white py-5 text-sm font-semibold uppercase tracking-[0.18em] text-black transition-all hover:scale-[1.02] hover:bg-fn-accent active:scale-[0.98]">
              {saved ? "Back to Workout Log" : "Continue to Workout Log"}
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
  const restTargetSeconds = getExerciseRestSeconds(exercise);
  const upcomingExercise = isLastSet ? exercises[exerciseIndex + 1] ?? exercise : exercise;
  const upcomingSetNumber = isLastSet ? 1 : setIndex + 2;
  const restProgressRatio = restTargetSeconds > 0 ? restSeconds / restTargetSeconds : 0;

  return (
    <div className="premium-grid-bg mx-auto flex min-h-[100dvh] max-w-shell flex-col bg-fn-bg px-0 py-0">
      {/* Progress bar - fixed at top for gym use */}
      <div className="fixed inset-x-0 top-0 z-50 h-1.5 w-full bg-fn-border/50 backdrop-blur-md">
        <div
          className="h-full bg-fn-accent shadow-[0_0_12px_rgba(10,217,196,0.75)] transition-all duration-300"
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
          {!showMotionFallback && !failedMediaUrls.includes(imageUrl) && (
            <button
              type="button"
              onClick={() => setFullscreenDemo({ url: imageUrl, name: exercise.name })}
              className="absolute top-4 right-4 z-10 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70 backdrop-blur-sm transition-all hover:bg-white/10 hover:text-white"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              View Demo
            </button>
          )}
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
        <header className="premium-panel-soft mb-6 flex items-center justify-between px-4 py-3">
          <Link
            href="/log/workout"
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-fn-muted transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            End Session
          </Link>
          <div className="flex flex-col items-end">
            <p className="mb-2 text-right text-[10px] font-semibold uppercase tracking-[0.22em] text-fn-accent leading-none">Live Coaching</p>
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
          <div className="flex flex-1 flex-col overflow-y-auto pb-24 pt-4">
            <div className="text-center mt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-fn-accent">Set {setIndex + 1} of {totalSets}</p>
              <h2 className="premium-headline text-5xl drop-shadow-2xl sm:text-6xl">
                {exercise.name}
              </h2>
              {exercise.notes && (
                <div className="premium-panel-soft mx-auto mt-4 max-w-sm p-4">
                  <p className="text-sm font-medium leading-relaxed text-white text-center">&quot;{exercise.notes}&quot;</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <span className="premium-badge">
                Rest {getExerciseRestSeconds(exercise)}s
              </span>
              {exercise.tempo && (
                <span className="premium-badge">
                  Tempo {exercise.tempo}
                </span>
              )}
              {typeof exercise.target_rir === "number" && (
                <span className="premium-badge">
                  Leave {exercise.target_rir} RIR
                </span>
              )}
              {typeof exercise.target_load_kg === "number" && (
                <span className="premium-badge">
                  {Math.round(exercise.target_load_kg * 10) / 10} kg target
                </span>
              )}
              <span className="premium-badge">
                {showMotionFallback ? "Cue mode" : "Demo active"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="premium-panel-soft p-5 text-center">
                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-fn-muted">Planned Reps</span>
                <p className="text-3xl font-black text-white">{exercise.reps}</p>
              </div>
              <div className="premium-panel-soft p-5 text-center">
                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-fn-muted">Intensity Target</span>
                <p className="text-2xl font-black text-fn-accent mt-1">{exercise.intensity}</p>
              </div>
            </div>

            {timedWorkSeconds != null && (
              <div className="premium-panel mt-6 p-6 text-center">
                <p className="premium-kicker">Interval Countdown</p>
                <p className="premium-headline mt-4 text-6xl tabular-nums">
                  {formatCountdown(workSecondsRemaining ?? timedWorkSeconds)}
                </p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                  Run the work interval, then log the set when you finish the effort.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsWorkTimerRunning((current) => !current)}
                    className="rounded-full bg-fn-accent px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-black transition-all hover:bg-white"
                  >
                    {isWorkTimerRunning ? "Pause Timer" : (workSecondsRemaining ?? timedWorkSeconds) === timedWorkSeconds ? "Start Timer" : "Resume Timer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsWorkTimerRunning(false);
                      setWorkSecondsRemaining(timedWorkSeconds);
                    }}
                    className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70 transition-all hover:bg-white/10 hover:text-white"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <div className="premium-panel p-6">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">Premium Walkthrough</p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fn-accent">Coach-grade cues</p>
                  </div>
                  <div className="mt-5 space-y-3">
                    {(exercise.walkthrough_steps ?? []).slice(0, 3).map((step, index) => (
                      <div
                        key={step}
                        className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                      >
                        <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-fn-accent/15 text-[10px] font-semibold text-fn-accent">
                          {index + 1}
                        </span>
                        <p className="text-sm font-medium leading-relaxed text-white/80">{step}</p>
                      </div>
                    ))}
                    {(exercise.walkthrough_steps ?? []).length === 0 && (
                      <p className="text-sm font-medium leading-relaxed text-white/70">
                        Koda is coaching this one like a top trainer would: stable setup, clean tempo, strong finish on every rep.
                      </p>
                    )}
                  </div>
                </div>

                <div className="premium-panel p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">Log This Set</p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fn-accent">Focus & Execute</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-[0.14em] text-fn-muted">Weight</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={currentWeight}
                        onChange={(e) => setCurrentWeight(e.target.value)}
                        placeholder={typeof exercise.target_load_kg === "number" ? String(Math.round(exercise.target_load_kg * 10) / 10) : "0"}
                        className="w-full rounded-2xl border-2 border-white/10 bg-white/5 py-4 pl-20 pr-4 text-right text-2xl font-black text-white focus:border-fn-accent focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-[0.14em] text-fn-muted">Reps</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={currentReps}
                        onChange={(e) => setCurrentReps(e.target.value)}
                        placeholder={getNumericRepPlaceholder(exercise.reps)}
                        className="w-full rounded-2xl border-2 border-white/10 bg-white/5 py-4 pl-16 pr-4 text-right text-2xl font-black text-white focus:border-fn-accent focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={startRest}
                    disabled={isPlayingAudio}
                    className="mt-5 w-full rounded-[2rem] bg-fn-accent py-6 text-xl font-black uppercase tracking-[0.14em] text-black shadow-[0_0_40px_rgba(10,217,196,0.3)] transition-transform active:scale-[0.98] hover:bg-white disabled:scale-100 disabled:opacity-80"
                  >
                    {isPlayingAudio ? (
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-1.5 h-4 bg-black rounded-full animate-[pulse_1s_ease-in-out_infinite]" />
                        <div className="w-1.5 h-6 bg-black rounded-full animate-[pulse_1s_ease-in-out_infinite_0.2s]" />
                        <div className="w-1.5 h-3 bg-black rounded-full animate-[pulse_1s_ease-in-out_infinite_0.4s]" />
                        <span className="ml-3 font-black italic tracking-[0.2em]">Coaching...</span>
                      </div>
                    ) : (
                      "Log Set + Start Rest"
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="premium-panel p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">Setup Checklist</p>
                  <div className="mt-4 space-y-3">
                    {(exercise.setup_checklist ?? []).slice(0, 3).map((item) => (
                      <div key={item} className="flex items-start gap-3">
                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-fn-accent" />
                        <p className="text-sm font-medium leading-relaxed text-white/75">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="premium-panel p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">Coach&apos;s Eye</p>
                  <div className="mt-4 space-y-3">
                    {(exercise.coaching_points ?? []).slice(0, 2).map((point) => (
                      <p key={point} className="text-sm font-medium leading-relaxed text-white/80">
                        {point}
                      </p>
                    ))}
                    {(exercise.common_mistakes ?? []).slice(0, 1).map((mistake) => (
                      <div key={mistake} className="rounded-2xl border border-amber-300/15 bg-amber-300/5 p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-100/70">Avoid this</p>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-amber-50/90">{mistake}</p>
                      </div>
                    ))}
                    {exercise.progression_note && (
                      <div className="rounded-2xl border border-fn-accent/20 bg-fn-accent/5 p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fn-accent">Progression note</p>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-white/75">{exercise.progression_note}</p>
                      </div>
                    )}
                  </div>
                </div>

                {currentExerciseLogs.length > 0 && (
                  <div className="premium-panel p-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">Logged So Far</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {currentExerciseLogs.map((log, index) => (
                        <span
                          key={`${log.weight ?? "bodyweight"}-${log.reps ?? "na"}-${index}`}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/75"
                        >
                          Set {index + 1}: {log.weight ? `${log.weight} kg` : "BW"}{log.reps ? ` x ${log.reps}` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center gap-2 text-center">
              <button
                type="button"
                onClick={() => setIsSwapOptionsVisible(true)}
                className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fn-accent/75 transition-colors hover:text-fn-accent"
              >
                Adapt or Swap Exercise
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
                        if (e.key === "Enter" && swapInput.trim() && !swapLoading) {
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
                    {["No Equipment", "Too Hard", "Knee Pain"].map((quickAction) => (
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
                <circle cx="144" cy="144" r="136" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={854} strokeDashoffset={854 - (854 * restProgressRatio)} className="text-fn-accent transition-all duration-1000 ease-linear shadow-[0_0_30px_rgba(10,217,196,0.5)]" />
              </svg>
              <div className="flex flex-col items-center">
                <span className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/55">Rest Phase</span>
                <p className="premium-headline text-8xl tabular-nums drop-shadow-lg">
                  {restSeconds}
                </p>
                <span className="mt-2 text-sm font-semibold uppercase tracking-[0.2em] text-fn-accent">seconds</span>
              </div>
            </div>

            <div className="premium-panel mb-auto w-full max-w-sm mx-auto p-8">
              <p className="premium-kicker mb-3 block">Preparing Next Set</p>
              <p className="text-3xl font-black italic tracking-tight text-white drop-shadow-md">
                {upcomingExercise.name}
              </p>
              <div className="mt-4 flex justify-between items-center border-t border-white/10 pt-4">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">Set {upcomingSetNumber} of {upcomingExercise.sets}</span>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">Target: {upcomingExercise.reps}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                <span className="premium-badge">
                  {upcomingExercise.intensity}
                </span>
                {upcomingExercise.tempo && (
                  <span className="premium-badge">
                    Tempo {upcomingExercise.tempo}
                  </span>
                )}
              </div>
            </div>

            {/* Priority 1 — Form coaching cue */}
            {restFormCue && (
              <div className="w-full max-w-sm mx-auto mt-4 rounded-2xl border border-fn-accent/20 bg-fn-accent/5 p-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-fn-accent">Key Cue — Next Set</p>
                <p className="text-sm font-medium leading-relaxed text-white/85">{restFormCue}</p>
              </div>
            )}

            {/* Priority 2 — Fatigue alert */}
            {restFatigueAlert && (
              <div className="w-full max-w-sm mx-auto mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">⚡ Fatigue Signal</p>
                <p className="text-sm font-medium leading-relaxed text-amber-50/90">{restFatigueAlert.message}</p>
                <p className="mt-1.5 text-xs font-semibold text-amber-200/70">{restFatigueAlert.suggestion}</p>
              </div>
            )}

            <button
              type="button"
              onClick={nextSet}
              className={`w-full max-w-sm mx-auto mt-8 rounded-[2.5rem] py-6 text-sm font-black uppercase tracking-[0.2em] transition-all duration-300 ${restSeconds <= 10
                ? "bg-fn-accent text-black shadow-[0_0_40px_rgba(10,217,196,0.3)] hover:bg-white hover:scale-105 active:scale-95"
                : "bg-black/60 border border-white/10 text-white backdrop-blur-md hover:bg-white/10 hover:border-white/20 active:scale-95"
                }`}
            >
              Start Next Set Now
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-fn-accent">Live Expert Coaching</p>
              <h3 className="premium-headline text-3xl">Ask Koda</h3>
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
                    className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-fn-accent hover:underline"
                  >
                    Ask something else
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fn-muted">Suggested for {exercise.name}</p>
                  {[
                    "Talk me through the setup.",
                    "What load should I choose for this set?",
                    "I need a pain-free swap.",
                    "Why is this in today's plan?"
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        void askCoach(q);
                      }}
                      className="w-full text-left rounded-2xl border border-white/10 bg-white/5 p-4 text-xs font-semibold text-white transition-colors hover:bg-white/10"
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
                placeholder="Ask your trainer for cues, swaps, or loading advice..."
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-white placeholder-white/30 focus:border-fn-accent/50 focus:outline-none transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && void askCoach()}
              />
              <button
                onClick={() => void askCoach()}
                disabled={coachLoading || !coachQuestion.trim()}
                className="rounded-2xl bg-fn-accent px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-black disabled:opacity-50"
              >
                Ask
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Exercise Demo Modal */}
      {fullscreenDemo && (
        <div className="fixed inset-0 z-[500] bg-black animate-in fade-in duration-200">
          {isExerciseVideoUrl(fullscreenDemo.url) ? (
            <video
              src={fullscreenDemo.url}
              className="absolute inset-0 h-full w-full object-contain"
              loop
              muted
              autoPlay
              playsInline
            />
          ) : (
            <Image
              src={fullscreenDemo.url}
              alt={fullscreenDemo.name}
              fill
              className="object-contain"
              unoptimized={isExerciseGifUrl(fullscreenDemo.url)}
            />
          )}
          {/* Bottom gradient + exercise name */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/50 to-transparent px-6 pb-12 pt-24">
            <p className="text-center text-2xl font-black italic uppercase tracking-tight text-white drop-shadow-2xl">
              {fullscreenDemo.name}
            </p>
          </div>
          {/* Close button */}
          <button
            type="button"
            onClick={() => setFullscreenDemo(null)}
            className="absolute right-5 top-12 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-white/10"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Floating Ask Coach Button */}
      {phase === "work" && !isCoachOpen && (
        <button
          onClick={() => setIsCoachOpen(true)}
          className="fixed bottom-32 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-fn-accent text-black shadow-[0_0_30px_rgba(10,217,196,0.4)] transition-transform hover:scale-110 active:scale-95 animate-in fade-in zoom-in"
        >
          <span className="absolute inset-0 rounded-full border border-fn-accent/60 animate-ping" />
          <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98 1 4.28L2 22l5.72-1c1.3.64 2.74 1 4.28 1 5.52 0 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z" />
          </svg>
        </button>
      )}
    </div>
  );
}
