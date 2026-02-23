"use client";

import Link from "next/link";
import { useState } from "react";
import type { WorkoutType } from "@/types";

const WORKOUT_TYPES: { value: WorkoutType; label: string }[] = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "mobility", label: "Mobility" },
  { value: "other", label: "Other" },
];

export default function WorkoutLogPage() {
  const [workouts] = useState<{ date: string; type: string; duration?: number }[]>([]);

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <header className="mb-6 flex items-center gap-4">
        <Link href="/log" className="text-fn-muted hover:text-white">← Log</Link>
        <h1 className="text-2xl font-bold text-white">Workout</h1>
      </header>

      <div className="grid gap-4">
        <Link
          href="/log/workout/guided"
          className="flex min-h-touch items-center justify-between rounded-xl border border-fn-teal bg-fn-surface p-4 transition-colors hover:bg-fn-surface-hover"
        >
          <span className="font-medium text-white">Guided workout</span>
          <span className="text-sm text-fn-muted">Step-by-step + rest timers</span>
        </Link>

        <section className="rounded-xl border border-fn-border bg-fn-surface p-4">
          <h2 className="text-sm font-medium text-fn-muted">Quick log</h2>
          <p className="mt-2 text-sm text-fn-muted">Add a workout (data will persist when Supabase is connected).</p>
          <WorkoutQuickForm />
        </section>

        {workouts.length > 0 ? (
          <ul className="space-y-2">
            {workouts.map((w, i) => (
              <li key={i} className="rounded-lg border border-fn-border bg-fn-surface p-3 text-sm text-white">
                {w.date} — {w.type} {w.duration != null && `(${w.duration} min)`}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fn-muted">No workouts yet. Start a guided session or quick log above.</p>
        )}
      </div>
    </div>
  );
}

function WorkoutQuickForm() {
  const [type, setType] = useState<WorkoutType>("strength");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <form className="mt-4 space-y-4" onSubmit={(e) => e.preventDefault()}>
      <label className="block text-sm text-fn-muted">Type</label>
      <div className="flex flex-wrap gap-2">
        {WORKOUT_TYPES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setType(value)}
            className={`min-h-touch rounded-lg px-4 py-2 text-sm font-medium ${
              type === value ? "bg-fn-teal text-fn-black" : "border border-fn-border text-white hover:bg-fn-surface-hover"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="block text-sm text-fn-muted">Duration (min)</label>
      <input
        type="number"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        className="min-h-touch w-full rounded-lg border border-fn-border bg-fn-surface px-4 py-3 text-white"
        placeholder="30"
      />
      <label className="block text-sm text-fn-muted">Notes</label>
      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="min-h-touch w-full rounded-lg border border-fn-border bg-fn-surface px-4 py-3 text-white"
        placeholder="Optional"
      />
      <button type="button" className="min-h-touch w-full rounded-lg bg-fn-teal py-3 font-medium text-fn-black hover:bg-fn-teal-dim">
        Save workout
      </button>
    </form>
  );
}
