"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WorkoutType } from "@/types";
import { PageLayout, Card, CardHeader, Button, Input, Label, EmptyState, LoadingState, ErrorMessage, Select } from "@/components/ui";
import { toLocalDateString } from "@/lib/date/local-date";
import { emitDataRefresh, useDataRefresh } from "@/lib/ui/data-sync";

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
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [editWorkoutData, setEditWorkoutData] = useState<{ type: string; duration: string; notes: string }>({ type: "strength", duration: "", notes: "" });
  const [workoutSaveStatus, setWorkoutSaveStatus] = useState<"idle" | "saving" | "error">("idle");

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

  useDataRefresh(["workout"], () => {
    setRefetch((current) => current + 1);
  });

  async function handleSaveWorkoutEdit(e: React.FormEvent, log_id: string) {
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
      duration_minutes: durationNum ?? undefined,
      notes: editWorkoutData.notes.trim() || undefined,
    } : w));
    setWorkoutSaveStatus("idle");
    setEditingWorkoutId(null);
  }

  return (
    <PageLayout title="Workout" subtitle="Capture sessions and keep progression visible">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Link href="/log/workout/guided" className="block">
          <Card padding="lg" className="h-full border-fn-accent relative overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(10,217,196,0.2)] backdrop-blur-md bg-fn-accent/[0.03]">
            <div className="absolute top-0 right-0 p-6 opacity-20">
              <svg className="w-24 h-24 text-fn-accent" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5l-3.47-2.02L7 16l.66-3.81L5 9.5l3.81-.55L10.5 5.5l1.69 3.45L16 9.5l-2.66 2.69.66 3.81z" />
              </svg>
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-fn-accent">Coaching Protocol</p>
            <h2 className="mt-4 font-display text-4xl font-black text-white uppercase italic tracking-tighter leading-none">Initiate Coached Session</h2>
            <p className="mt-4 text-base font-medium text-fn-ink/40 leading-relaxed uppercase tracking-widest">Plan-aware sequence flow with neural guidance.</p>
            <p className="mt-8 text-[11px] font-black uppercase tracking-[0.3em] text-fn-accent flex items-center gap-2">
              Begin Guided Experience
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </p>
          </Card>
        </Link>

        <Card>
          <CardHeader title="Intelligence Insight" subtitle="Contextual coaching signals" />
          <p className="mt-4 text-base font-medium text-fn-ink/40 leading-relaxed uppercase tracking-widest">Optimized performance metrics suggest maintaining core volume with high-intensity finishers.</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/motion">
              <Button variant="secondary" size="sm">Motion Lab</Button>
            </Link>
            <Link href="/?focus=ai">
              <Button variant="ghost" size="sm" className="border border-white/10 hover:border-white/20">
                Query Concierge
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      <Card className="mt-4" padding="lg">
        <CardHeader title="System Session Log" subtitle="Capture completions for adaptive recalibration" />
        <WorkoutQuickForm
          onSuccess={() => {
            setRefetch((n) => n + 1);
            emitDataRefresh(["dashboard", "workout"]);
            setPostWorkoutInsight(null);
            setPostWorkoutInsightLoading(true);
            fetch("/api/v1/ai/post-workout-insight", { method: "POST" })
              .then((r) => r.json())
              .then((body: { insight?: string | null }) => {
                if (body.insight && typeof body.insight === "string") setPostWorkoutInsight(body.insight);
              })
              .catch(() => { })
              .finally(() => setPostWorkoutInsightLoading(false));
            fetch("/api/v1/analytics/process-prs", { method: "POST" }).catch(() => { });
          }}
        />
        {postWorkoutInsightLoading && (
          <div className="mt-8 h-12 rounded-xl bg-white/[0.03] animate-pulse" />
        )}
        {postWorkoutInsight && !postWorkoutInsightLoading && (
          <div className="mt-8 rounded-xl3 border border-fn-accent/20 bg-fn-accent/5 p-6 backdrop-blur-md shadow-fn-soft animate-in fade-in zoom-in-95 duration-500">
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-fn-accent">Neural Recalibration</p>
            <p className="mt-4 text-base font-medium italic leading-relaxed text-fn-ink/60">{postWorkoutInsight}</p>
            <button type="button" onClick={() => setPostWorkoutInsight(null)} className="mt-6 text-[10px] font-black uppercase tracking-[0.3em] text-fn-accent hover:text-white transition-all">
              Acknowledge Insight
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
            <ul className="mt-8 space-y-3">
              {workouts.map((w) => (
                <li key={w.log_id} className="rounded-xl border border-white/[0.08] bg-black/40 px-5 py-4 transition-all hover:bg-black/60 shadow-fn-soft">
                  {editingWorkoutId === w.log_id ? (
                    <form onSubmit={(e) => handleSaveWorkoutEdit(e, w.log_id)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-[10px] uppercase font-black tracking-widest text-fn-ink/40 mb-1">Session Vector</Label>
                          <Select value={editWorkoutData.type} onChange={(e) => setEditWorkoutData({ ...editWorkoutData, type: e.target.value })} className="bg-black/40 border-white/10 uppercase font-black text-[11px] italic">
                            {WORKOUT_TYPES.map(t => <option key={t.value} value={t.value} className="bg-fn-bg">{t.label}</option>)}
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
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-fn-accent">{w.date}</span>
                          <span className="h-1 w-1 rounded-full bg-white/20" />
                          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 italic">{w.workout_type}</span>
                        </div>
                        <p className="mt-1 text-base font-black text-white italic truncate uppercase">
                          {w.duration_minutes != null ? `${w.duration_minutes} Minutes` : "Incomplete metrics"}
                          {w.notes ? ` · ${w.notes}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingWorkoutId(w.log_id);
                            setEditWorkoutData({
                              type: w.workout_type,
                              duration: w.duration_minutes ? String(w.duration_minutes) : "",
                              notes: w.notes || "",
                            });
                          }}
                          className="p-2 text-fn-ink/40 hover:bg-white/5 hover:text-white rounded-lg transition-all"
                          title="Edit workout"
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={async () => {
                            const supabase = createClient();
                            if (!supabase) return;
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) {
                              // User not logged in, cannot delete.
                              // In a real app, you might show a message or redirect to login.
                              console.warn("User not logged in, cannot delete workout.");
                              return;
                            }
                            const { error } = await supabase.from("workout_logs").delete().eq("log_id", w.log_id);
                            if (!error) {
                              setWorkouts(prev => prev.filter(item => item.log_id !== w.log_id));
                              emitDataRefresh(["dashboard", "workout"]);
                            }
                          }}
                          className="p-2 text-fn-ink/40 hover:bg-fn-danger/10 hover:text-fn-danger rounded-lg transition-all"
                          title="Delete workout"
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState className="mt-4" message="No workouts yet. Start a guided session or quick log above." action={<Link href="/log/workout/guided"><Button variant="secondary" size="sm">Start guided workout</Button></Link>} />
          )}
        </Card>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/history?tab=workouts">
            <Button variant="secondary" size="sm">View history</Button>
          </Link>
          <Link href="/motion">
            <Button variant="ghost" size="sm" className="border border-fn-border">
              Analyze movement
            </Button>
          </Link>
        </div>
      </section>
    </PageLayout >
  );
}

function WorkoutQuickForm({ onSuccess }: { onSuccess: () => void }) {
  const [type, setType] = useState<WorkoutType>("strength");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [exerciseName, setExerciseName] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
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
    const exercisePayload = exerciseName.trim() ? [{
      name: exerciseName.trim(),
      sets: sets ? parseInt(sets, 10) : 1,
      reps: reps || "0",
      weight: weight ? parseFloat(weight) : undefined
    }] : [];

    const { error: err } = await supabase.from("workout_logs").insert({
      user_id: user.id,
      date: toLocalDateString(),
      workout_type: type,
      exercises: exercisePayload,
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
    setExerciseName("");
    setSets("");
    setReps("");
    setWeight("");
    onSuccess();
    // Trigger award check
    fetch("/api/v1/awards/check", { method: "POST" }).catch(() => { });
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
              className={`rounded-xl border px-4 py-3 text-left transition-all duration-200 ${type === value
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
      <div className="grid gap-5">
        <div>
          <Label>Exercise Details (Optional)</Label>
          <div className="mt-2 space-y-3">
            <Input
              type="text"
              placeholder="Exercise name (e.g. Bench Press)"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              className="bg-black/40 border-white/10 font-black italic uppercase text-[11px] tracking-widest"
            />
            <div className="grid grid-cols-3 gap-3">
              <Input type="number" placeholder="Sets" value={sets} onChange={(e) => setSets(e.target.value)} className="bg-black/40 border-white/10" />
              <Input type="number" placeholder="Reps" value={reps} onChange={(e) => setReps(e.target.value)} className="bg-black/40 border-white/10" />
              <Input type="number" placeholder="Weight" value={weight} onChange={(e) => setWeight(e.target.value)} className="bg-black/40 border-white/10" />
            </div>
          </div>
        </div>
        <div>
          <Label>Duration (min)</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {["15", "30", "45", "60"].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setDuration(val)}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-black transition-all ${duration === val ? "border-fn-accent bg-fn-accent/10 shadow-[0_0_20px_rgba(10,217,196,0.1)] text-fn-accent" : "border-fn-border bg-fn-surface text-fn-muted hover:border-fn-accent/50 hover:text-white"}`}
              >
                {val}m
              </button>
            ))}
            <input
              type="number"
              placeholder="Other"
              value={!["15", "30", "45", "60"].includes(duration) ? duration : ""}
              onChange={(e) => setDuration(e.target.value)}
              className={`w-20 rounded-xl border px-3 py-2 text-center text-sm font-black focus:outline-none transition-all ${!["15", "30", "45", "60", ""].includes(duration) ? "border-fn-accent bg-fn-accent/10 text-fn-accent" : "border-fn-border bg-fn-surface text-fn-muted hover:border-fn-accent/50 hover:text-white"}`}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between items-end mb-2">
            <Label>Intensity / RPE</Label>
            <span className={`text-xs font-bold ${notes ? "text-fn-accent" : "text-fn-muted"}`}>{notes ? `${notes}/10` : "Select 1-10"}</span>
          </div>
          <div className="flex items-center gap-3 bg-fn-surface border border-fn-border rounded-xl px-4 py-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-fn-muted">Light</span>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={notes || "5"}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full accent-fn-accent h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-[10px] font-black uppercase tracking-widest text-fn-muted">Max</span>
          </div>
        </div>
      </div>
      {error && <ErrorMessage message={error} />}
      <Button type="submit" loading={saving} className="w-full">Save workout</Button>
    </form>
  );
}
