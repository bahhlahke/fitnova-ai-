"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Input,
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
  const router = useRouter();
  const [tab, setTab] = useState<"workouts" | "nutrition">("workouts");
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [nutrition, setNutrition] = useState<NutritionRow[]>([]);
  const [workoutTypeFilter, setWorkoutTypeFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);
  const [expandedNutritionDate, setExpandedNutritionDate] = useState<string | null>(null);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [editWorkoutData, setEditWorkoutData] = useState<{ type: string; duration: string; notes: string }>({ type: "strength", duration: "", notes: "" });
  const [workoutSaveStatus, setWorkoutSaveStatus] = useState<"idle" | "saving" | "error">("idle");

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

      const summaryUrl =
        typeof window !== "undefined"
          ? new URL("/api/v1/ai/history-summary", window.location.origin).toString()
          : null;
      if (summaryUrl) {
        setAiSummaryLoading(true);
        fetch(summaryUrl, { method: "POST" })
          .then((r) => r.json())
          .then((body) => {
            if (body.summary) setAiSummary(body.summary);
          })
          .catch(() => {
            // Non-blocking enhancement; keep history usable when summary generation is unavailable.
          })
          .finally(() => setAiSummaryLoading(false));
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (requestedTab === "nutrition") {
      setTab("nutrition");
      return;
    }
    setTab("workouts");
  }, []);

  const filteredWorkouts =
    workoutTypeFilter === "all"
      ? workouts
      : workouts.filter((w) => w.workout_type === workoutTypeFilter);

  async function handleSaveWorkoutEdit(e: FormEvent, log_id: string) {
    e.preventDefault();
    setWorkoutSaveStatus("saving");
    const supabase = createClient();
    if (!supabase) return;
    const durationNum = editWorkoutData.duration.trim() ? parseInt(editWorkoutData.duration, 10) : null;
    const { error } = await supabase.from("workout_logs").update({
      workout_type: editWorkoutData.type,
      duration_minutes: durationNum,
      notes: editWorkoutData.notes.trim() || null,
    }).eq("log_id", log_id);

    if (error) {
      setWorkoutSaveStatus("error");
      return;
    }

    setWorkouts(prev => prev.map(w => w.log_id === log_id ? {
      ...w,
      workout_type: editWorkoutData.type,
      duration_minutes: durationNum ?? undefined, // Keep as undefined if null
      notes: editWorkoutData.notes.trim() || undefined, // Keep as undefined if null
    } : w));
    setWorkoutSaveStatus("idle");
    setEditingWorkoutId(null);
  }

  const nutritionByDate = nutrition.reduce<Record<string, NutritionRow[]>>((acc, row) => {
    if (!acc[row.date]) acc[row.date] = [];
    acc[row.date].push(row);
    return acc;
  }, {});
  const nutritionDates = Object.keys(nutritionByDate).sort((a, b) => b.localeCompare(a));

  return (
    <PageLayout
      title="History"
      subtitle="Past workouts and nutrition"
      backHref={tab === "nutrition" ? "/log/nutrition" : "/log/workout"}
      backLabel={tab === "nutrition" ? "Nutrition" : "Workout"}
    >
      {/* AI Performance Evolutionary Summary */}
      <Card className="mb-8 border-fn-accent/20 bg-fn-accent/5 overflow-hidden">
        <div className="flex items-center gap-2 mb-4 px-1">
          <div className="h-2 w-2 rounded-full bg-fn-accent animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-accent">Evolutionary Performance Synthesis</span>
        </div>
        {aiSummaryLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-3 w-full rounded bg-white/5" />
            <div className="h-3 w-4/5 rounded bg-white/5" />
            <div className="h-3 w-5/6 rounded bg-white/5" />
          </div>
        ) : (
          <p className="text-sm font-medium italic text-white/80 leading-relaxed border-l border-fn-accent/30 pl-4 py-1">
            &quot;{aiSummary ?? "Synthesizing longitudinal data strands... Complete at least 5 sessions to establish a stable evolutionary baseline."}&quot;
          </p>
        )}
      </Card>

      <div className="mb-8 inline-flex rounded-xl border border-white/[0.08] bg-black/40 p-1 backdrop-blur-md">
        <button
          type="button"
          onClick={() => {
            setTab("workouts");
            router.replace("/history?tab=workouts", { scroll: false });
          }}
          className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${tab === "workouts"
            ? "bg-fn-accent/20 text-fn-accent shadow-fn-soft border border-fn-accent/20"
            : "text-fn-ink/40 hover:text-white"
            }`}
        >
          Session Logs
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("nutrition");
            router.replace("/history?tab=nutrition", { scroll: false });
          }}
          className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${tab === "nutrition"
            ? "bg-fn-accent/20 text-fn-accent shadow-fn-soft border border-fn-accent/20"
            : "text-fn-ink/40 hover:text-white"
            }`}
        >
          Metabolic Intake
        </button>
      </div>

      {loading ? (
        <LoadingState />
      ) : tab === "workouts" ? (
        <Card>
          <CardHeader title="Workout history" subtitle="Tap a row for details" />
          <div className="mt-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-fn-muted mb-2">Filter by type</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setWorkoutTypeFilter("all")}
                className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${workoutTypeFilter === "all" ? "bg-fn-accent text-fn-bg shadow-[0_0_15px_rgba(10,217,196,0.3)]" : "bg-fn-surface border border-fn-border text-fn-muted hover:border-fn-accent/50 hover:text-white"}`}
              >
                All
              </button>
              {WORKOUT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setWorkoutTypeFilter(t)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${workoutTypeFilter === t ? "bg-fn-accent text-fn-bg shadow-[0_0_15px_rgba(10,217,196,0.3)]" : "bg-fn-surface border border-fn-border text-fn-muted hover:border-fn-accent/50 hover:text-white"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          {filteredWorkouts.length === 0 ? (
            <EmptyState className="mt-4" message="No workouts match. Log a session from the Workout page." />
          ) : (
            <ul className="mt-8 space-y-3">
              {filteredWorkouts.map((w) => (
                <li key={w.log_id} className="rounded-xl border border-white/[0.08] bg-black/40 overflow-hidden shadow-fn-soft transition-all hover:bg-black/60">
                  <div
                    className="flex items-center justify-between w-full px-5 py-4 text-left cursor-pointer"
                    onClick={() => setExpandedWorkoutId(expandedWorkoutId === w.log_id ? null : w.log_id)}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-fn-accent">{w.date}</span>
                        <span className="h-1 w-1 rounded-full bg-white/20" />
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 italic">{w.workout_type}</span>
                      </div>
                      <p className="mt-1 text-sm font-black text-white italic uppercase tracking-tight">
                        {w.duration_minutes != null ? `${w.duration_minutes} Minutes` : "Session Complete"}
                      </p>
                    </div>
                    <svg className={`h-4 w-4 text-fn-ink/20 transition-transform ${expandedWorkoutId === w.log_id ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  {expandedWorkoutId === w.log_id && (
                    <div className="border-t border-white/[0.08] bg-black/20 px-5 py-5 text-sm">
                      {editingWorkoutId === w.log_id ? (
                        <form onSubmit={(e) => handleSaveWorkoutEdit(e, w.log_id)} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-[10px] uppercase font-black tracking-widest text-fn-ink/40 mb-1">Session Vector</Label>
                              <Select value={editWorkoutData.type} onChange={(e) => setEditWorkoutData({ ...editWorkoutData, type: e.target.value })} className="bg-black/40 border-white/10 uppercase font-black text-[11px] italic">
                                {WORKOUT_TYPES.map(t => <option key={t} value={t} className="bg-fn-bg">{t}</option>)}
                              </Select>
                            </div>
                            <div>
                              <Label className="text-[10px] uppercase font-black tracking-widest text-fn-ink/40 mb-1">Duration (min)</Label>
                              <Input type="number" value={editWorkoutData.duration} onChange={(e) => setEditWorkoutData({ ...editWorkoutData, duration: e.target.value })} className="bg-black/40 border-white/10 font-black italic" />
                            </div>
                          </div>
                          <div>
                            <Label className="text-[10px] uppercase font-black tracking-widest text-fn-ink/40 mb-1">Observations</Label>
                            <Input type="text" value={editWorkoutData.notes} onChange={(e) => setEditWorkoutData({ ...editWorkoutData, notes: e.target.value })} className="bg-black/40 border-white/10 font-medium italic" />
                          </div>
                          <div className="flex gap-3 pt-2">
                            <Button type="submit" size="sm" loading={workoutSaveStatus === "saving"}>Update Log</Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setEditingWorkoutId(null)}>Cancel</Button>
                          </div>
                          {workoutSaveStatus === "error" && <p className="text-fn-danger text-[10px] font-black uppercase tracking-widest mt-1">Recalibration failed.</p>}
                        </form>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-3">Metrics / Exercises</p>
                          {(w.exercises ?? []).map((e, i) => (
                            <div key={i} className="flex justify-between items-center py-2 border-b border-white/[0.04] last:border-0">
                              <span className="text-sm font-black italic text-white uppercase tracking-tight">{e.name ?? "Undefined Protocol"}</span>
                              <span className="text-sm font-black italic text-fn-accent uppercase tracking-tight">{e.sets ?? 0} <span className="text-[10px] not-italic text-white/40 ml-1">x</span> {e.reps ?? "?"}</span>
                            </div>
                          ))}
                          {w.notes && (
                            <div className="mt-4 rounded-lg bg-white/[0.03] p-3">
                              <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">Observer Notes</p>
                              <p className="text-xs font-medium italic text-white/60">{w.notes}</p>
                            </div>
                          )}
                          <div className="mt-6 flex gap-3">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setEditingWorkoutId(w.log_id);
                                setEditWorkoutData({
                                  type: w.workout_type,
                                  duration: w.duration_minutes ? String(w.duration_minutes) : "",
                                  notes: w.notes || "",
                                });
                              }}
                              className="text-[10px] px-4"
                            >
                              Revise metrics
                            </Button>
                          </div>
                        </div>
                      )}
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
            <ul className="mt-8 space-y-3">
              {nutritionDates.map((date) => {
                const rows = nutritionByDate[date];
                const totalCals = rows.reduce((s, r) => s + (r.total_calories ?? 0), 0);
                const mealCount = rows.reduce((s, r) => s + (r.meals?.length ?? 0), 0);
                return (
                  <li key={date} className="rounded-xl border border-white/[0.08] bg-black/40 overflow-hidden shadow-fn-soft transition-all hover:bg-black/60">
                    <div
                      className="flex items-center justify-between w-full px-5 py-4 text-left cursor-pointer"
                      onClick={() => setExpandedNutritionDate(expandedNutritionDate === date ? null : date)}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-fn-accent">{date}</span>
                        <p className="mt-1 text-sm font-black text-white italic truncate uppercase">
                          {totalCals} Calories <span className="text-[10px] not-italic text-white/40 ml-1">·</span> {mealCount} Events
                        </p>
                      </div>
                      <svg className={`h-4 w-4 text-fn-ink/20 transition-transform ${expandedNutritionDate === date ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    {expandedNutritionDate === date && (
                      <div className="border-t border-white/[0.08] bg-black/20 px-5 py-5 text-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-3">Temporal Logs</p>
                        {rows.flatMap((r) => (r.meals ?? []).map((m, i) => (
                          <div key={`${r.log_id}-${i}`} className="flex justify-between items-center py-2 border-b border-white/[0.04] last:border-0">
                            <div className="flex flex-col">
                              <span className="text-xs font-black uppercase tracking-widest text-fn-accent italic">{m.time}</span>
                              <span className="text-sm font-black italic text-white uppercase tracking-tight mt-0.5">{m.description}</span>
                            </div>
                            {m.calories != null && (
                              <span className="text-sm font-black italic text-white uppercase tracking-tight">{m.calories} <span className="text-[9px] not-italic text-white/40">kcal</span></span>
                            )}
                          </div>
                        )))}
                        <div className="mt-6">
                          <Link href={`/log/nutrition?date=${date}`}>
                            <Button size="sm" variant="secondary" className="text-[10px] px-4">Recalibrate Day</Button>
                          </Link>
                        </div>
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
        <Link href={tab === "nutrition" ? "/log/nutrition" : "/log/workout"}>
          <Button variant="secondary">
            Back to {tab === "nutrition" ? "Nutrition" : "Workout"}
          </Button>
        </Link>
      </div>
    </PageLayout>
  );
}
