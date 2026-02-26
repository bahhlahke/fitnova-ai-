"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { WorkoutType } from "@/types";
import type { MealEntry } from "@/types";
import {
  PageLayout,
  Card,
  CardHeader,
  Button,
  LoadingState,
  EmptyState,
  Select,
  Label,
} from "@/components/ui";

type WorkoutRow = {
  log_id: string;
  date: string;
  workout_type: string;
  duration_minutes?: number | null;
  exercises?: Array<{ name?: string; sets?: number; reps?: string }>;
  notes?: string | null;
};

type NutritionRow = {
  log_id: string;
  date: string;
  meals: MealEntry[];
  total_calories?: number | null;
};

const WORKOUT_TYPES: WorkoutType[] = ["strength", "cardio", "mobility", "other"];

export default function HistoryPage() {
  const [tab, setTab] = useState<"workouts" | "nutrition">("workouts");
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [nutrition, setNutrition] = useState<NutritionRow[]>([]);
  const [workoutTypeFilter, setWorkoutTypeFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);
  const [expandedNutritionDate, setExpandedNutritionDate] = useState<string | null>(null);

  const fetchData = useCallback(() => {
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
      Promise.all([
        supabase
          .from("workout_logs")
          .select("log_id, date, workout_type, duration_minutes, exercises, notes")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(100),
        supabase
          .from("nutrition_logs")
          .select("log_id, date, meals, total_calories")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(100),
      ]).then(([workoutRes, nutritionRes]) => {
        setWorkouts((workoutRes.data ?? []) as WorkoutRow[]);
        setNutrition((nutritionRes.data ?? []) as NutritionRow[]);
        setLoading(false);
      }).catch(() => setLoading(false));
    }).then(undefined, () => setLoading(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const filteredWorkouts =
    workoutTypeFilter === "all"
      ? workouts
      : workouts.filter((w) => w.workout_type === workoutTypeFilter);

  const nutritionByDate = nutrition.reduce<Record<string, NutritionRow[]>>((acc, row) => {
    if (!acc[row.date]) acc[row.date] = [];
    acc[row.date].push(row);
    return acc;
  }, {});
  const nutritionDates = Object.keys(nutritionByDate).sort((a, b) => b.localeCompare(a));

  return (
    <PageLayout title="History" subtitle="Past workouts and nutrition" backHref="/log" backLabel="Log">
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("workouts")}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
            tab === "workouts"
              ? "border-fn-primary bg-fn-primary text-white"
              : "border-fn-border bg-white text-black hover:bg-fn-surface-hover"
          }`}
        >
          Workouts
        </button>
        <button
          type="button"
          onClick={() => setTab("nutrition")}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
            tab === "nutrition"
              ? "border-fn-primary bg-fn-primary text-white"
              : "border-fn-border bg-white text-black hover:bg-fn-surface-hover"
          }`}
        >
          Nutrition
        </button>
      </div>

      {loading ? (
        <LoadingState />
      ) : tab === "workouts" ? (
        <Card>
          <CardHeader title="Workout history" subtitle="Tap a row for details" />
          <div className="mt-3">
            <Label htmlFor="workout-type-filter" className="text-xs text-fn-muted">Filter by type</Label>
            <Select
              id="workout-type-filter"
              value={workoutTypeFilter}
              onChange={(e) => setWorkoutTypeFilter(e.target.value)}
              className="mt-1 max-w-[180px]"
            >
              <option value="all">All types</option>
              {WORKOUT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </Select>
          </div>
          {filteredWorkouts.length === 0 ? (
            <EmptyState className="mt-4" message="No workouts match. Log a session from the Workout page." />
          ) : (
            <ul className="mt-4 space-y-2">
              {filteredWorkouts.map((w) => (
                <li key={w.log_id} className="rounded-xl border border-fn-border bg-fn-surface-hover overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedWorkoutId(expandedWorkoutId === w.log_id ? null : w.log_id)}
                    className="w-full px-3 py-3 text-left text-sm"
                  >
                    <span className="font-semibold text-fn-ink">{w.date}</span>
                    <span className="ml-2 text-fn-muted">{w.workout_type}</span>
                    {w.duration_minutes != null && (
                      <span className="ml-2 text-fn-muted">{w.duration_minutes} min</span>
                    )}
                  </button>
                  {expandedWorkoutId === w.log_id && (
                    <div className="border-t border-fn-border bg-white px-3 py-3 text-sm text-neutral-600">
                      {(w.exercises ?? []).map((e, i) => (
                        <p key={i} className="text-black">{e.name ?? "?"} — {e.sets ?? 0} x {e.reps ?? "?"}</p>
                      ))}
                      {w.notes && <p className="mt-2 text-black">{w.notes}</p>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader title="Nutrition history" subtitle="By day" />
          {nutritionDates.length === 0 ? (
            <EmptyState className="mt-4" message="No nutrition logs yet." />
          ) : (
            <ul className="mt-4 space-y-2">
              {nutritionDates.map((date) => {
                const rows = nutritionByDate[date];
                const totalCals = rows.reduce((s, r) => s + (r.total_calories ?? 0), 0);
                const mealCount = rows.reduce((s, r) => s + (r.meals?.length ?? 0), 0);
                return (
                  <li key={date} className="rounded-xl border border-fn-border bg-fn-surface-hover overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedNutritionDate(expandedNutritionDate === date ? null : date)}
                      className="w-full px-3 py-3 text-left text-sm"
                    >
                      <span className="font-semibold text-fn-ink">{date}</span>
                      <span className="ml-2 text-fn-muted">{totalCals} cal</span>
                      <span className="ml-2 text-fn-muted">{mealCount} meal(s)</span>
                    </button>
                    {expandedNutritionDate === date && (
                      <div className="border-t border-fn-border bg-white px-3 py-3 text-sm text-neutral-600">
                        {rows.flatMap((r) => (r.meals ?? []).map((m, i) => (
                          <p key={`${r.log_id}-${i}`} className="text-black">
                            {m.time} — {m.description}
                            {m.calories != null ? ` (${m.calories} cal)` : ""}
                          </p>
                        )))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      <div className="mt-6">
        <Link href="/log">
          <Button variant="secondary">Back to Log</Button>
        </Link>
      </div>
    </PageLayout>
  );
}
