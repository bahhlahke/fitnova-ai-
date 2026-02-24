"use client";

import { useState, useRef, useEffect } from "react";
import { ErrorMessage, Button } from "@/components/ui";
import type { DailyPlan } from "@/lib/plan/types";
import { createClient } from "@/lib/supabase/client";
import { toLocalDateString } from "@/lib/date/local-date";

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
      let data: { error?: string; reply?: string; code?: string };
      try {
        data = (await res.json()) as { error?: string; reply?: string; code?: string };
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
    <div className="mx-auto flex max-w-lg flex-col px-4 py-6 h-[calc(100vh-5rem)]">
      <header className="mb-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-white">
          AI <span className="text-fn-magenta">Coach</span>
        </h1>
        <p className="mt-1 text-sm text-fn-muted">Ask for plans, form cues, or start today&apos;s workout</p>
      </header>

      <div className="mb-3 rounded-lg border border-fn-border bg-fn-surface p-3">
        <p className="text-xs text-fn-muted">Not medical advice. If pain is severe or worsening, stop and seek licensed care.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={generateDailyPlan} loading={planLoading} size="sm">Generate today&apos;s plan</Button>
          {dailyPlan && <Button variant="secondary" size="sm" onClick={logPlannedWorkoutComplete}>Log planned workout complete</Button>}
        </div>
        {planError && <ErrorMessage className="mt-2" message={planError} />}
        {logStatus && <p className="mt-2 text-xs text-fn-muted">{logStatus}</p>}
        {dailyPlan && (
          <div className="mt-3 rounded-md border border-fn-border p-3">
            <p className="text-sm font-medium text-white">{dailyPlan.training_plan.focus}</p>
            <p className="text-xs text-fn-muted mt-1">Target: {dailyPlan.nutrition_plan.calorie_target} cal · Protein {dailyPlan.nutrition_plan.macros.protein_g}g</p>
            <ul className="mt-2 space-y-1 text-xs text-fn-muted">
              {dailyPlan.training_plan.exercises.slice(0, 4).map((exercise) => (
                <li key={exercise.name}>{exercise.name}: {exercise.sets} sets · {exercise.reps}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-fn-border bg-fn-surface p-4">
        {messages.length === 0 && (
          <p className="text-fn-muted">Send a message to get started. Try asking for an upper-body workout or logging a bench-press session.</p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`rounded-lg px-4 py-3 ${
              msg.role === "user" ? "ml-4 bg-fn-teal/20 text-white" : "mr-4 bg-fn-surface-hover text-white"
            }`}
          >
            <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
          </div>
        ))}
        {loading && <p className="text-fn-muted">Thinking...</p>}
        {error && <ErrorMessage message={error} />}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex-shrink-0 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message coach..."
          className="min-h-touch flex-1 rounded-lg border border-fn-border bg-fn-surface px-4 py-3 text-white placeholder-fn-muted focus:border-fn-teal focus:outline-none focus:ring-1 focus:ring-fn-teal"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="min-h-touch min-w-touch rounded-lg bg-fn-magenta px-4 py-3 font-medium text-white hover:bg-fn-magenta-dim disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
