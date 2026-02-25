"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { ErrorMessage, Button, Card, CardHeader } from "@/components/ui";
import type { DailyPlan } from "@/lib/plan/types";
import { createClient } from "@/lib/supabase/client";
import { toLocalDateString } from "@/lib/date/local-date";

/** Fitness professional imagery: tailored to user preference for aesthetic female coaches. */
const COACH_IMAGE_V1 =
  "/Users/blakeaycock/.gemini/antigravity/brain/6dcb9847-0df3-4ceb-8caf-437152f4c67a/female_coach_v1_retry_1771989508516.png";

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
  const bottomRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="mx-auto w-full max-w-shell px-4 py-12 sm:px-8">
      <header className="mb-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
          <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-xl3 border border-fn-accent/30 shadow-[0_0_30px_rgba(10,217,196,0.2)]">
            <Image
              src={coachImageUrl}
              alt="FitNova AI Coach"
              fill
              className="object-cover"
              sizes="128px"
            />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-fn-accent">Elite Protocol</p>
            <h1 className="mt-2 font-display text-4xl font-black text-white italic tracking-tighter uppercase sm:text-6xl">Coach Room</h1>
            <p className="mt-4 max-w-2xl text-lg font-medium text-fn-muted leading-relaxed">Direct access to your AI performance lead. Adaptive strategy, metabolic tuning, and absolute accountability.</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card padding="lg" className="border-white/5 bg-white/[0.02]">
            <CardHeader title="Control Center" subtitle="Real-time protocol management" />
            <div className="mt-6 flex flex-wrap gap-4">
              <Button onClick={generateDailyPlan} loading={planLoading} size="sm">Generate Today&apos;s Protocol</Button>
              {dailyPlan && <Button variant="secondary" size="sm" onClick={logPlannedWorkoutComplete}>Commit Session</Button>}
            </div>
            {planError && <ErrorMessage className="mt-4" message={planError} />}
            {logStatus && <p className="mt-4 rounded-xl bg-fn-accent/10 border border-fn-accent/20 px-4 py-3 text-sm text-fn-accent font-bold uppercase tracking-wider">{logStatus}</p>}
          </Card>

          <Card className="flex h-[600px] flex-col border-white/5 bg-white/[0.02]">
            <div className="flex-1 overflow-y-auto space-y-6 p-6 scrollbar-hide">
              {messages.length === 0 && (
                <div className="space-y-8 py-10 text-center">
                  <p className="text-lg font-medium text-fn-muted max-w-md mx-auto leading-relaxed">System initialized. Secure connection established with Lead Coach. Select a command or type your query.</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => setInput(prompt)}
                        className="rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-white/10 hover:border-white/20 active:scale-95"
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
                  <div className={`max-w-[85%] rounded-2xl px-6 py-4 text-sm font-medium leading-relaxed shadow-xl ${msg.role === "user"
                    ? "bg-white text-black rounded-tr-none"
                    : "bg-fn-surface border border-white/5 text-fn-ink rounded-tl-none backdrop-blur-3xl"
                    }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-none px-6 py-4 animate-pulse">
                    <div className="flex gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-fn-accent" />
                      <div className="h-1.5 w-1.5 rounded-full bg-fn-accent delay-75" />
                      <div className="h-1.5 w-1.5 rounded-full bg-fn-accent delay-150" />
                    </div>
                  </div>
                </div>
              )}
              {error && <ErrorMessage message={error} />}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-6 border-t border-white/5 bg-black/20 backdrop-blur-3xl">
              <div className="relative flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Inquire performance strategy..."
                  className="flex-1 rounded-xl2 border border-white/10 bg-white/5 px-6 py-4 text-white placeholder-white/30 transition-all focus:border-fn-accent/50 focus:outline-none focus:ring-4 focus:ring-fn-accent/10"
                  disabled={loading}
                />
                <Button type="submit" disabled={loading || !input.trim()} className="px-10">Send</Button>
              </div>
            </form>
          </Card>
        </div>

        <aside className="space-y-6">
          {dailyPlan ? (
            <Card className="border-fn-accent/30 bg-fn-accent/5">
              <CardHeader title="Live Protocol" subtitle={dailyPlan.training_plan.focus} />
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-fn-accent mb-1">Target</p>
                    <p className="text-xl font-black text-white">{dailyPlan.nutrition_plan.calorie_target}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-fn-accent mb-1">Protein</p>
                    <p className="text-xl font-black text-white">{dailyPlan.nutrition_plan.macros.protein_g}g</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-fn-muted">Session Breakdown</p>
                  <ul className="space-y-3">
                    {dailyPlan.training_plan.exercises.slice(0, 6).map((exercise) => (
                      <li key={exercise.name} className="group flex flex-col gap-2 p-3 rounded-xl bg-white/5 border border-white/5 transition-all hover:bg-white/10">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-white uppercase italic tracking-tighter">{exercise.name}</span>
                          <span className="text-xs font-black text-fn-accent">{exercise.sets}×{exercise.reps}</span>
                        </div>
                        {exercise.video_url && (
                          <button
                            onClick={() => setActiveVideo({ url: exercise.video_url!, name: exercise.name })}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-fn-accent/70 hover:text-fn-accent transition-colors"
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                            Watch Demo
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="border-white/5 bg-white/[0.01] opacity-50">
              <div className="py-20 text-center">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-fn-muted mb-4">No Protocol Active</p>
                <p className="text-sm font-medium text-fn-muted leading-relaxed">Generate your daily targets to activate live monitoring.</p>
              </div>
            </Card>
          )}

          <Card className="border-white/5 bg-white/[0.01]">
            <CardHeader title="Intelligence" subtitle="System baseline" />
            <div className="mt-4 space-y-4">
              <p className="text-xs text-fn-muted leading-relaxed italic">Coach is utilizing available Bio-Sync data, historical volume, and nutritional adherence to synthesize recommendations.</p>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-fn-accent w-3/4 animate-pulse" />
              </div>
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
