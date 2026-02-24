"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { ErrorMessage, Button, Card, CardHeader } from "@/components/ui";
import type { DailyPlan } from "@/lib/plan/types";
import { createClient } from "@/lib/supabase/client";
import { toLocalDateString } from "@/lib/date/local-date";

/** Fitness professional imagery: tailored to viewer gender (male user → female pro, female user → male pro). */
const COACH_IMAGE_FEMALE_PRO =
  "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=400&fit=crop&q=80";
const COACH_IMAGE_MALE_PRO =
  "https://images.unsplash.com/photo-1583454110551-21eb2fa97ead?w=400&h=400&fit=crop&q=80";

const SUGGESTED_PROMPTS = [
  "Give me a 35-minute home workout with no equipment",
  "How do I close my protein gap without eating more meat?",
  "I'm sore from yesterday — should I train or rest?",
  "Suggest a simple meal that fits 40g protein and 500 cal",
  "What's one form cue I should focus on for squats?",
  "Help me adjust my plan for a busy week",
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
  const [coachImageUrl, setCoachImageUrl] = useState<string>(COACH_IMAGE_FEMALE_PRO);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("user_profile")
        .select("sex")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          const sex = (data as { sex?: string } | null)?.sex?.toLowerCase();
          setCoachImageUrl(sex === "female" ? COACH_IMAGE_MALE_PRO : COACH_IMAGE_FEMALE_PRO);
        });
    });
  }, []);

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
    <div className="mx-auto w-full max-w-shell px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-fn-border shadow-fn-soft sm:h-28 sm:w-28">
          <Image
            src={coachImageUrl}
            alt="FitNova AI Coach"
            fill
            className="object-cover"
            sizes="112px"
          />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fn-muted">Your AI coach</p>
          <h1 className="mt-2 font-display text-3xl text-fn-ink sm:text-4xl">Daily accountability and decisions</h1>
          <p className="mt-2 text-fn-muted">Evidence-based training adjustments, nutrition guidance, and clear next steps. Ask anything — form cues, meal ideas, or how to adapt when life gets busy.</p>
        </div>
      </header>

      <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader title="Plan actions" subtitle="Quick controls before you chat" />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={generateDailyPlan} loading={planLoading} size="sm">Generate today&apos;s plan</Button>
            {dailyPlan && <Button variant="secondary" size="sm" onClick={logPlannedWorkoutComplete}>Log planned workout complete</Button>}
          </div>
          <p className="mt-3 text-xs text-fn-muted">Educational AI coaching only. Stop and seek care for severe or worsening symptoms.</p>
          {planError && <ErrorMessage className="mt-3" message={planError} />}
          {logStatus && <p className="mt-3 rounded-xl bg-fn-bg-alt px-3 py-2 text-sm text-fn-muted">{logStatus}</p>}
        </Card>

        {dailyPlan && (
          <Card>
            <CardHeader title="Today preview" subtitle={dailyPlan.training_plan.focus} />
            <p className="mt-2 text-sm text-fn-muted">Target: {dailyPlan.nutrition_plan.calorie_target} cal · Protein {dailyPlan.nutrition_plan.macros.protein_g}g</p>
            <ul className="mt-3 space-y-1 text-sm text-fn-muted">
              {dailyPlan.training_plan.exercises.slice(0, 4).map((exercise) => (
                <li key={exercise.name}>{exercise.name}: {exercise.sets} sets · {exercise.reps}</li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <Card className="flex h-[65vh] min-h-[400px] flex-col">
        <CardHeader title="Coach chat" subtitle="Get a clear answer and one concrete next step" />

        <div className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-xl border border-fn-border bg-fn-surface-hover p-3">
          {messages.length === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-fn-muted">Tap a prompt below or type your own. The coach will give you actionable guidance and, when relevant, one alternative option.</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="rounded-lg border border-fn-border bg-white px-3 py-2 text-left text-sm text-fn-ink hover:bg-fn-surface-hover focus:outline-none focus:ring-2 focus:ring-fn-primary/20"
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
              className={`rounded-xl px-4 py-3 text-sm ${
                msg.role === "user" ? "ml-4 bg-fn-primary text-white" : "mr-4 bg-white text-fn-ink"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}
          {loading && <p className="text-sm text-fn-muted">Thinking...</p>}
          {error && <ErrorMessage message={error} />}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for a workout, meal idea, or plan adjustment..."
            className="min-h-touch flex-1 rounded-xl border border-fn-border bg-white px-4 py-3 text-fn-ink placeholder-fn-muted focus:border-fn-primary focus:outline-none focus:ring-2 focus:ring-fn-primary/20"
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !input.trim()}>Send</Button>
        </form>
      </Card>
    </div>
  );
}
