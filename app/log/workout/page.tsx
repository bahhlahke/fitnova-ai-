"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WorkoutType } from "@/types";
import { PageLayout, Card, CardHeader, Button, Input, Label, EmptyState, LoadingState, ErrorMessage } from "@/components/ui";
import { toLocalDateString } from "@/lib/date/local-date";

const WORKOUT_TYPES: { value: WorkoutType; label: string; hint: string }[] = [
  { value: "strength", label: "Strength", hint: "Progressive overload" },
  { value: "cardio", label: "Cardio", hint: "Aerobic conditioning" },
  { value: "mobility", label: "Mobility", hint: "Movement quality" },
  { value: "other", label: "Other", hint: "Custom session" },
];

export default function WorkoutLogPage() {
  const [workouts, setWorkouts] = useState<{ log_id: string; date: string; workout_type: string; duration_minutes?: number; notes?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refetch, setRefetch] = useState(0);
  const [postWorkoutInsight, setPostWorkoutInsight] = useState<string | null>(null);
  const [postWorkoutInsightLoading, setPostWorkoutInsightLoading] = useState(false);

  const fetchWorkouts = useCallback(() => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setLoading(false);
        return;
      }
      supabase
        .from("workout_logs")
        .select("log_id, date, workout_type, exercises, duration_minutes, notes")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(20)
        .then(
          ({ data }) => {
            setWorkouts((data ?? []) as { log_id: string; date: string; workout_type: string; duration_minutes?: number; notes?: string }[]);
            setLoading(false);
          },
          () => setLoading(false)
        );
    }).then(undefined, () => setLoading(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchWorkouts();
  }, [fetchWorkouts, refetch]);

  return (
    <PageLayout title="Workout" subtitle="Capture sessions and keep progression visible" backHref="/log" backLabel="Log">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Link href="/log/workout/guided" className="block">
          <Card padding="lg" className="h-full border-fn-accent/30 bg-fn-accent/5 transition hover:-translate-y-0.5 hover:border-fn-accent/50 hover:shadow-[0_0_30px_rgba(10,217,196,0.1)]">
            <p className="text-[10px] font-black uppercase tracking-widest text-fn-accent">Guided mode</p>
            <h2 className="mt-2 text-xl font-black text-fn-ink uppercase italic tracking-tight">Start today&apos;s coached session</h2>
            <p className="mt-2 text-sm text-fn-muted leading-relaxed">Step-by-step flow with plan-aware exercise sequence and rest pacing.</p>
            <p className="mt-4 text-xs font-black uppercase tracking-widest text-fn-accent">Open guided workout →</p>
          </Card>
        </Link>

        <Card>
          <CardHeader title="AI suggestion" subtitle="Use this when your day is constrained" />
          <p className="mt-3 text-sm text-fn-muted">If time is limited, do your first three compound movements and one finisher interval.</p>
        </Card>
      </div>

      <Card className="mt-4" padding="lg">
        <CardHeader title="Quick log" subtitle="Save a completed workout" />
        <WorkoutQuickForm
          onSuccess={() => {
            setRefetch((n) => n + 1);
            setPostWorkoutInsight(null);
            setPostWorkoutInsightLoading(true);
            fetch("/api/v1/ai/post-workout-insight", { method: "POST" })
              .then((r) => r.json())
              .then((body: { insight?: string | null }) => {
                if (body.insight && typeof body.insight === "string") setPostWorkoutInsight(body.insight);
              })
              .catch(() => {})
              .finally(() => setPostWorkoutInsightLoading(false));
          }}
        />
        {postWorkoutInsightLoading && (
          <p className="mt-4 text-sm text-fn-muted">Generating insight...</p>
        )}
        {postWorkoutInsight && !postWorkoutInsightLoading && (
          <div className="mt-4 rounded-2xl border border-fn-accent/20 bg-white/5 px-5 py-4 text-sm text-fn-ink animate-in fade-in duration-300">
            <p className="text-[10px] font-black uppercase tracking-widest text-fn-accent mb-2">Coach Insight</p>
            <p className="leading-relaxed text-fn-ink">{postWorkoutInsight}</p>
            <button type="button" onClick={() => setPostWorkoutInsight(null)} className="mt-3 text-[10px] font-black uppercase tracking-widest text-fn-muted hover:text-white transition-colors">
              Dismiss
            </button>
          </div>
        )}
      </Card>

      <section className="mt-4">
        <Card>
          <CardHeader title="Recent sessions" subtitle="Last 20 entries" />
          {loading ? (
            <LoadingState className="mt-3" />
          ) : workouts.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {workouts.map((w) => (
                <li key={w.log_id} className="rounded-xl border border-fn-border bg-fn-surface-hover px-3 py-3 text-sm text-fn-ink">
                  <p className="font-semibold">{w.date} · {w.workout_type}</p>
                  <p className="mt-1 text-fn-muted">
                    {w.duration_minutes != null ? `${w.duration_minutes} min` : "Duration not set"}
                    {w.notes ? ` · ${w.notes}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState className="mt-4" message="No workouts yet. Start a guided session or quick log above." action={<Link href="/log/workout/guided"><Button variant="secondary" size="sm">Start guided workout</Button></Link>} />
          )}
        </Card>
      </section>
    </PageLayout>
  );
}

function WorkoutQuickForm({ onSuccess }: { onSuccess: () => void }) {
  const [type, setType] = useState<WorkoutType>("strength");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase not configured.");
      setSaving(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Sign in to save workout.");
      setSaving(false);
      return;
    }
    const durationNum = duration.trim() ? parseInt(duration, 10) : undefined;
    if (duration.trim() && (durationNum == null || !Number.isInteger(durationNum) || durationNum < 1 || durationNum > 600)) {
      setError("Duration must be 1-600 minutes.");
      setSaving(false);
      return;
    }
    const { error: err } = await supabase.from("workout_logs").insert({
      user_id: user.id,
      date: toLocalDateString(),
      workout_type: type,
      exercises: [],
      duration_minutes: durationNum ?? null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setDuration("");
    setNotes("");
    onSuccess();
  }

  return (
    <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
      <div>
        <Label>Session type</Label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {WORKOUT_TYPES.map(({ value, label, hint }) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={`rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                type === value
                  ? "border-fn-accent bg-fn-accent/10 shadow-[0_0_20px_rgba(10,217,196,0.1)]"
                  : "border-fn-border bg-fn-surface text-fn-muted hover:bg-fn-surface-hover hover:text-fn-ink hover:border-fn-accent/30"
              }`}
            >
              <p className={`text-sm font-black uppercase tracking-tight ${type === value ? "text-fn-accent" : "text-fn-ink"}`}>{label}</p>
              <p className={`mt-1 text-xs ${type === value ? "text-fn-accent/70" : "text-fn-muted"}`}>{hint}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="duration">Duration (min)</Label>
          <Input id="duration" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="30" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did it feel?" className="mt-1" />
        </div>
      </div>
      {error && <ErrorMessage message={error} />}
      <Button type="submit" loading={saving} className="w-full">Save workout</Button>
    </form>
  );
}
