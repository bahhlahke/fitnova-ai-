"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { ErrorMessage, Button, Card, CardHeader } from "@/components/ui";
import type { DailyPlan } from "@/lib/plan/types";
import { createClient } from "@/lib/supabase/client";
import { toLocalDateString } from "@/lib/date/local-date";
import { coachVoice } from "@/lib/audio/coach-voice";

/** Fitness professional imagery. Use public/images/coach-female-pro.jpg for a custom asset (see public/images/README.md). */
const COACH_IMAGE_V1 =
  "/images/refined/hero.png";

const SUGGESTED_PROMPTS = [
  "Create a 40-minute high-intensity metabolic circuit",
  "How can I optimize my sleep for better recovery?",
  "I'm feeling a 4/10 on energy—how should we adjust today?",
  "Analyze my last session's volume for progression",
  "Design a high-protein vegan meal plan for this week",
];

type Message = { role: "user" | "assistant"; content: string };

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [logStatus, setLogStatus] = useState<string | null>(null);
  const [coachImageUrl, setCoachImageUrl] = useState<string>(COACH_IMAGE_V1);
  const [activeVideo, setActiveVideo] = useState<{ url: string; name: string } | null>(null);
  const [isWatchMode, setIsWatchMode] = useState(false);
  const [watchActiveIndex, setWatchActiveIndex] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    coachVoice.setOnSpeakingChange(setIsSpeaking);
    return () => coachVoice.setOnSpeakingChange(() => { });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function generateDailyPlan() {
    setPlanLoading(true);
    setPlanError(null);
    setLogStatus(null);

    try {
      const res = await fetch("/api/v1/plan/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as {
        error?: string;
        plan?: DailyPlan;
      };
      if (!res.ok || !data.plan) throw new Error(data.error ?? "Failed to generate daily plan");
      setDailyPlan(data.plan);
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Could not generate plan.");
    } finally {
      setPlanLoading(false);
    }
  }

  async function logPlannedWorkoutComplete() {
    if (!dailyPlan) return;
    const supabase = createClient();
    if (!supabase) {
      setLogStatus("Supabase is not configured.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLogStatus("Sign in to save workout completion.");
      return;
    }

    const { error: insertErr } = await supabase.from("workout_logs").insert({
      user_id: user.id,
      date: toLocalDateString(),
      workout_type: "strength",
      duration_minutes: dailyPlan.training_plan.duration_minutes,
      exercises: dailyPlan.training_plan.exercises,
      notes: "Completed planned daily session",
    });

    if (insertErr) {
      setLogStatus(insertErr.message);
      return;
    }

    setLogStatus("Planned workout saved to your log.");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/ai/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      let data: { error?: string; reply?: string };
      try {
        data = (await res.json()) as { error?: string; reply?: string };
      } catch {
        setError(res.ok ? "Invalid response" : "Request failed");
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setMessages((m) => [...m, { role: "assistant", content: typeof data.reply === "string" ? data.reply : "No response." }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (isWatchMode && dailyPlan) {
    const activeExercise = dailyPlan.training_plan.exercises[watchActiveIndex];
    const isCompleted = watchActiveIndex >= dailyPlan.training_plan.exercises.length;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        {/* Watch simulated viewport */}
        <div className="relative flex h-[240px] w-[190px] flex-col overflow-hidden rounded-[40px] border-[6px] border-[#222] bg-black p-4 shadow-[0_0_50px_rgba(255,255,255,0.1)]">
          <div className="absolute right-[-6px] top-12 h-14 w-2 rounded-l-md bg-[#333]" />
          <div className="absolute right-[-6px] top-32 h-8 w-1 rounded-l-sm bg-[#333]" />

          <button
            onClick={() => {
              setIsWatchMode(false);
              if (voiceEnabled) coachVoice.speak("Pausing protocol.");
            }}
            className="absolute left-2 top-2 z-10 p-1 text-white/50 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
          </button>

          {/* Speaking Indicator */}
          {isSpeaking && (
            <div className="absolute top-2 right-4 flex gap-1 z-10 opacity-70">
              <div className="h-1.5 w-1 bg-fn-accent rounded-full animate-[ping_1s_ease-in-out_infinite]" />
              <div className="h-2 w-1 bg-fn-accent rounded-full animate-[ping_1s_ease-in-out_infinite_100ms]" />
              <div className="h-1.5 w-1 bg-fn-accent rounded-full animate-[ping_1s_ease-in-out_infinite_200ms]" />
            </div>
          )}

          {isCompleted ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <svg className="mb-2 h-10 w-10 text-fn-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="font-display text-sm font-black uppercase italic tracking-tighter text-white">Session<br />Complete</p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col justify-between">
              <div className="mt-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-fn-accent">Set 1 of {activeExercise?.sets || 1}</p>
                <h2 className="mt-1 line-clamp-2 text-sm font-bold leading-tight text-white">{activeExercise?.name}</h2>
                <p className="mt-1 text-lg font-black text-white">{activeExercise?.reps} Reps</p>
              </div>
              <button
                onClick={() => {
                  const nextIdx = watchActiveIndex + 1;
                  setWatchActiveIndex(nextIdx);
                  if (voiceEnabled) {
                    if (nextIdx >= dailyPlan.training_plan.exercises.length) {
                      coachVoice.speak("Session complete. Excellent work. Hydrate and commence recovery protocol.");
                    } else {
                      const nextEx = dailyPlan.training_plan.exercises[nextIdx];
                      coachVoice.speak(`${nextEx.sets} sets of ${nextEx.reps} ${nextEx.name}. Let's go.`);
                    }
                  }
                }}
                className="w-full rounded-full bg-fn-accent py-2 text-[11px] font-black uppercase tracking-wider text-black active:bg-fn-accent/80"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-shell px-4 py-16 sm:px-12">
      <header className="mb-16 flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center">
          <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-xl3 border-2 border-fn-accent/30 shadow-[0_0_50px_rgba(10,217,196,0.3)]">
            <Image
              src={coachImageUrl}
              alt="FitNova AI Coach"
              fill
              className="object-cover scale-110 grayscale-[30%] hover:grayscale-0 transition-all duration-700"
              sizes="160px"
            />
          </div>
          <div className="max-w-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-fn-accent mb-3">Live Protocol Node</p>
            <h1 className="font-display text-5xl font-black text-white italic tracking-tighter uppercase sm:text-7xl leading-[0.9]">Coach Room</h1>
            <p className="mt-6 text-xl font-medium text-fn-muted leading-relaxed">Direct access to your AI performance lead. Adaptive strategy and absolute accountability.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            disabled={!dailyPlan}
            title={!dailyPlan ? "Generate a protocol first" : undefined}
            onClick={() => {
              const newState = !voiceEnabled;
              setVoiceEnabled(newState);
              coachVoice.toggle(newState);
              if (newState) coachVoice.speak("Audio coach active. Awaiting your command.");
            }}
            className={`flex items-center gap-3 rounded-xl border-2 px-6 py-3 text-xs font-black uppercase tracking-widest transition-all duration-300 ${!dailyPlan ? "opacity-30 cursor-not-allowed border-white/10 bg-white/5 text-fn-muted" : voiceEnabled ? "border-fn-accent/50 bg-fn-accent text-fn-bg shadow-[0_0_30px_rgba(10,217,196,0.3)]" : "border-white/10 bg-white/5 text-fn-muted hover:border-fn-accent/50 hover:text-white"}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5 10v4a2 2 0 002 2h2l4 4V4L9 8H7a2 2 0 00-2 2z" /></svg>
            Voice {voiceEnabled ? "On" : "Off"}
          </button>
          <Button
            variant="secondary"
            disabled={!dailyPlan}
            title={!dailyPlan ? "Generate a protocol first" : undefined}
            onClick={() => {
              if (!dailyPlan) return;
              setIsWatchMode(true);
              if (voiceEnabled) {
                const firstEx = dailyPlan.training_plan.exercises[0];
                coachVoice.speak(`Protocol initiated. First up: ${firstEx.sets} sets of ${firstEx.reps} ${firstEx.name}.`);
              }
            }}
            className={`gap-3 border-2 h-[52px] ${!dailyPlan ? "opacity-30 cursor-not-allowed" : ""}`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Watch Mode
          </Button>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
        <div className="space-y-8">
          <Card className="border-white/5 bg-white/[0.01]">
            <CardHeader title="Control Center" subtitle="Real-time protocol management" />
            <div className="mt-8 flex flex-wrap gap-4">
              <Button onClick={generateDailyPlan} loading={planLoading}>Generate Protocol</Button>
              {dailyPlan && <Button variant="secondary" onClick={logPlannedWorkoutComplete}>Commit Session</Button>}
            </div>
            {planError && <ErrorMessage className="mt-4" message={planError} />}
            {logStatus && (
              <div className="mt-6 flex items-center gap-3 rounded-2xl bg-fn-accent/10 border border-fn-accent/20 px-6 py-4 animate-in fade-in zoom-in duration-300">
                <svg className="w-5 h-5 text-fn-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                <span className="text-sm text-fn-accent font-black uppercase tracking-widest">{logStatus}</span>
              </div>
            )}
          </Card>

          <Card className="flex h-[700px] flex-col border-white/5 bg-white/[0.01] p-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-8 p-10 scrollbar-hide">
              {messages.length === 0 && (
                <div className="space-y-12 py-12 text-center">
                  <p className="text-xl font-medium text-fn-muted max-w-md mx-auto leading-relaxed">Secure connection established. Lead Coach is awaiting your command.</p>
                  <div className="flex flex-wrap justify-center gap-4">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => setInput(prompt)}
                        className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-white/10 hover:border-fn-accent/30 active:scale-95"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] rounded-3xl px-8 py-5 text-sm font-medium leading-relaxed shadow-2xl ${msg.role === "user"
                    ? "bg-white text-black rounded-tr-none"
                    : "bg-fn-surface border border-white/5 text-fn-ink rounded-tl-none backdrop-blur-3xl"
                    }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/5 rounded-3xl rounded-tl-none px-8 py-5 animate-pulse">
                    <div className="flex gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-fn-accent" />
                      <div className="h-2 w-2 rounded-full bg-fn-accent delay-75" />
                      <div className="h-2 w-2 rounded-full bg-fn-accent delay-150" />
                    </div>
                  </div>
                </div>
              )}
              {error && <ErrorMessage message={error} />}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-8 border-t border-white/5 bg-black/40 backdrop-blur-3xl">
              <div className="relative flex gap-4">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Inquire performance strategy..."
                  className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-8 py-5 text-white placeholder-white/20 transition-all focus:border-fn-accent/50 focus:outline-none focus:ring-4 focus:ring-fn-accent/10"
                  disabled={loading}
                />
                <Button type="submit" disabled={loading || !input.trim()} className="px-12">Submit</Button>
              </div>
            </form>
          </Card>
        </div>

        <aside className="space-y-8">
          {dailyPlan ? (
            <Card className="border-fn-accent/20 bg-fn-accent/5">
              <CardHeader title="Live Protocol" subtitle={dailyPlan.training_plan.focus} />
              <div className="mt-8 space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-black/60 border border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-fn-accent mb-2">Target</p>
                    <p className="text-2xl font-black text-white italic">{dailyPlan.nutrition_plan.calorie_target}</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-black/60 border border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-fn-accent mb-2">Protein</p>
                    <p className="text-2xl font-black text-white italic">{dailyPlan.nutrition_plan.macros.protein_g}g</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-fn-muted flex items-center gap-2">
                    <span className="h-1 w-4 bg-fn-accent rounded-full" />
                    Session Breakdown
                  </p>
                  <ul className="space-y-4">
                    {dailyPlan.training_plan.exercises.slice(0, 6).map((exercise) => (
                      <li key={exercise.name} className="group flex flex-col gap-3 p-5 rounded-2xl bg-white/5 border border-white/5 transition-all hover:bg-white/10 hover:border-fn-accent/20">
                        <div className="flex justify-between items-start">
                          <span className="text-base font-black text-white uppercase italic tracking-tighter leading-tight max-w-[70%]">{exercise.name}</span>
                          <span className="text-xs font-black text-fn-accent bg-fn-accent/10 px-2 py-1 rounded-md">{exercise.sets}×{exercise.reps}</span>
                        </div>
                        {exercise.video_url && (
                          <button
                            onClick={() => setActiveVideo({ url: exercise.video_url!, name: exercise.name })}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-fn-accent/70 hover:text-fn-accent transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                            Demo Sequence
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="border-white/5 bg-white/[0.01] opacity-60">
              <div className="py-24 text-center">
                <div className="mx-auto mb-6 h-12 w-12 rounded-full border border-white/10 flex items-center justify-center opacity-20">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <p className="text-xs font-black uppercase tracking-[0.4em] text-fn-muted">Protocol Dormant</p>
              </div>
            </Card>
          )}

          <Card className="border-white/5 bg-white/[0.01]">
            <CardHeader title="Quick Actions" subtitle="Shortcuts" />
            <div className="mt-4 space-y-2">
              <a href="/log/workout" className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-widest text-fn-muted hover:border-fn-accent/20 hover:text-white transition-all">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                Log Workout
              </a>
              <a href="/progress" className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-widest text-fn-muted hover:border-fn-accent/20 hover:text-white transition-all">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                View Progress
              </a>
              <a href="/progress/add" className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-widest text-fn-muted hover:border-fn-accent/20 hover:text-white transition-all">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Log Check-in
              </a>
            </div>
          </Card>
        </aside>
      </div>

      {/* Video Overlay */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-xl3 border border-white/10 bg-fn-bg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h3 className="font-display text-2xl font-black text-white italic uppercase tracking-tighter">{activeVideo.name}</h3>
              <button
                onClick={() => setActiveVideo(null)}
                className="rounded-full bg-white/5 p-2 text-fn-muted hover:text-fn-accent transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="aspect-video bg-black/40">
              <video
                src={activeVideo.url}
                controls
                autoPlay
                loop
                className="h-full w-full object-contain"
              />
            </div>
            <div className="p-6 bg-white/[0.02]">
              <p className="text-xs text-fn-muted font-medium italic">&quot;Maintain external rotation of the femur and prioritize depth over load for initial sets.&quot;</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
