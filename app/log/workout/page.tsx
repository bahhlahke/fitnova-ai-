"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WorkoutType } from "@/types";
import { PageLayout, Card, CardHeader, Button, Input, Label, EmptyState, LoadingState, ErrorMessage } from "@/components/ui";
import { toLocalDateString } from "@/lib/date/local-date";

const WORKOUT_TYPES: { value: WorkoutType; label: string }[] = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "mobility", label: "Mobility" },
  { value: "other", label: "Other" },
];

export default function WorkoutLogPage() {
  const [workouts, setWorkouts] = useState<{ log_id: string; date: string; workout_type: string; duration_minutes?: number; notes?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refetch, setRefetch] = useState(0);
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
    <PageLayout
      title="Workout"
      subtitle="Guided or quick log"
      backHref="/log"
      backLabel="Log"
    >
      <div className="grid gap-4">
        <Link
          href="/log/workout/guided"
          className="flex min-h-touch items-center justify-between rounded-xl border border-fn-teal bg-fn-surface p-4 transition-colors hover:bg-fn-surface-hover"
        >
          <span className="font-medium text-white">Guided workout</span>
          <span className="text-sm text-fn-muted">Step-by-step + rest timers</span>
        </Link>

        <Card>
          <CardHeader title="Quick log" subtitle="Add a workout" />
          <WorkoutQuickForm onSuccess={() => setRefetch((n) => n + 1)} />
        </Card>

        {loading ? (
          <LoadingState />
        ) : workouts.length > 0 ? (
          <ul className="space-y-2">
            {workouts.map((w) => (
              <li
                key={w.log_id}
                className="rounded-lg border border-fn-border bg-fn-surface p-3 text-sm text-white"
              >
                {w.date} — {w.workout_type}
                {w.duration_minutes != null && ` (${w.duration_minutes} min)`}
                {w.notes && ` — ${w.notes}`}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            message="No workouts yet. Start a guided session or quick log above."
            action={
              <Link href="/log/workout/guided">
                <Button variant="secondary" size="sm">
                  Start guided workout
                </Button>
              </Link>
            }
          />
        )}
      </div>
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
      setError("Duration must be 1–600 minutes.");
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
        <Label>Type</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {WORKOUT_TYPES.map(({ value, label }) => (
            <Button
              key={value}
              type="button"
              variant={type === value ? "primary" : "secondary"}
              size="sm"
              onClick={() => setType(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="duration">Duration (min)</Label>
        <Input
          id="duration"
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="30"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional"
          className="mt-1"
        />
      </div>
      {error && <ErrorMessage message={error} />}
      <Button type="submit" loading={saving} className="w-full">
        Save workout
      </Button>
    </form>
  );
}
