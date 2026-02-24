"use client";

import { useState, useRef, useEffect } from "react";
import { ErrorMessage, Button, Card, CardHeader } from "@/components/ui";
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
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fn-muted">AI Coach</p>
        <h1 className="mt-2 font-display text-4xl text-fn-ink">Daily accountability and decisions</h1>
        <p className="mt-2 text-fn-muted">Ask for training adjustments, nutrition guidance, and progression rationale.</p>
      </header>

      <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader title="Plan actions" subtitle="Use quick controls before chatting" />
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

      <Card className="flex h-[65vh] flex-col">
        <CardHeader title="Coach chat" subtitle="Evidence-based guidance, concise decisions" />

        <div className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-xl border border-fn-border bg-fn-surface-hover p-3">
          {messages.length === 0 && (
            <p className="text-sm text-fn-muted">Try asking for a 35-minute home adjustment or a protein-gap closing meal idea.</p>
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
            placeholder="Message coach..."
            className="min-h-touch flex-1 rounded-xl border border-fn-border bg-white px-4 py-3 text-fn-ink placeholder-fn-muted focus:border-fn-primary focus:outline-none focus:ring-2 focus:ring-fn-primary/20"
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !input.trim()}>Send</Button>
        </form>
      </Card>
    </div>
  );
}
