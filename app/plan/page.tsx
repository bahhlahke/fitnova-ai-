"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { PageLayout, Card, CardHeader, Button, LoadingState } from "@/components/ui";
import { toLocalDateString } from "@/lib/date/local-date";
import Link from "next/link";
import type { WeeklyPlan, WeeklyPlanDay } from "@/lib/plan/types";

const INTENSITY_CONFIG = {
    high: {
        label: "High",
        bar: "bg-fn-danger",
        border: "border-fn-danger/30",
        bg: "bg-fn-danger/5",
        text: "text-fn-danger",
        glow: "shadow-[0_0_20px_rgba(255,59,48,0.2)]",
        dot: "bg-fn-danger",
        barWidth: "w-full",
    },
    moderate: {
        label: "Moderate",
        bar: "bg-amber-400",
        border: "border-amber-400/30",
        bg: "bg-amber-400/5",
        text: "text-amber-400",
        glow: "shadow-[0_0_20px_rgba(251,191,36,0.15)]",
        dot: "bg-amber-400",
        barWidth: "w-2/3",
    },
    low: {
        label: "Recovery",
        bar: "bg-fn-accent",
        border: "border-fn-accent/20",
        bg: "bg-fn-accent/5",
        text: "text-fn-accent",
        glow: "",
        dot: "bg-fn-accent",
        barWidth: "w-1/3",
    },
} as const;

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getTodayWeekday(): number {
    return new Date().getDay();
}

function isToday(dateLocal: string): boolean {
    return dateLocal === toLocalDateString();
}

function isPast(dateLocal: string): boolean {
    return dateLocal < toLocalDateString();
}

export default function PlanPage() {
    const { user, loading: authLoading } = useAuth();
    const [plan, setPlan] = useState<WeeklyPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [regenerating, setRegenerating] = useState(false);
    const [aiInsight, setAiInsight] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [selectedDay, setSelectedDay] = useState<WeeklyPlanDay | null>(null);
    const [preferredDays, setPreferredDays] = useState<number[]>([1, 2, 3, 4, 5]);
    const [goals, setGoals] = useState<string[]>([]);
    const [weekStats, setWeekStats] = useState<{ workoutCount: number; avgCalories: number | null; weightTrend: string | null } | null>(null);

    const loadPlan = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [planRes, profileRes] = await Promise.all([
                fetch(`/api/v1/plan/weekly?today=${toLocalDateString()}`),
                createClient()?.from("user_profile").select("goals, devices").eq("user_id", user.id).maybeSingle(),
            ]);

            const planBody = await planRes.json() as { plan?: WeeklyPlan };
            if (planBody.plan) {
                setPlan(planBody.plan);
                // Default selected day to today
                const todayPlan = planBody.plan.days.find(d => isToday(d.date_local));
                setSelectedDay(todayPlan ?? planBody.plan.days[0] ?? null);
            }

            if (profileRes?.data) {
                setGoals((profileRes.data.goals as string[]) ?? []);
                const schedule = (profileRes.data.devices as Record<string, unknown>)?.training_schedule as { preferred_training_days?: number[] } | undefined;
                if (schedule?.preferred_training_days) setPreferredDays(schedule.preferred_training_days);
            }
        } catch { /* degraded */ } finally {
            setLoading(false);
        }
    }, [user]);

    const loadAiInsight = useCallback(async () => {
        if (!user) return;
        setAiLoading(true);
        try {
            const res = await fetch("/api/v1/ai/weekly-insight", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ localDate: toLocalDateString() }),
            });
            const body = await res.json() as { insight?: string; workoutCount?: number; avgCalories?: number | null; weightTrend?: string | null };
            if (body.insight) setAiInsight(body.insight);
            setWeekStats({ workoutCount: body.workoutCount ?? 0, avgCalories: body.avgCalories ?? null, weightTrend: body.weightTrend ?? null });
        } catch { /* degraded */ } finally {
            setAiLoading(false);
        }
    }, [user]);

    const regenerate = useCallback(async () => {
        if (!user) return;
        setRegenerating(true);
        try {
            const res = await fetch("/api/v1/plan/weekly?refresh=1");
            const body = await res.json() as { plan?: WeeklyPlan };
            if (body.plan) {
                setPlan(body.plan);
                const todayPlan = body.plan.days.find(d => isToday(d.date_local));
                setSelectedDay(todayPlan ?? body.plan.days[0] ?? null);
                setAiInsight(null);
                void loadAiInsight();
            }
        } catch { /* degraded */ } finally {
            setRegenerating(false);
        }
    }, [user, loadAiInsight]);

    useEffect(() => {
        if (!authLoading && user) {
            void loadPlan();
            void loadAiInsight();
        } else if (!authLoading) {
            setLoading(false);
        }
    }, [user, authLoading, loadPlan, loadAiInsight]);

    const todayWeekday = getTodayWeekday();

    if (loading) return (
        <PageLayout title="Training Plan" subtitle="Your personalized weekly schedule">
            <LoadingState message="Composing your training plan..." />
        </PageLayout>
    );

    if (!user) return (
        <PageLayout title="Training Plan" subtitle="Your personalized weekly schedule">
            <Card padding="lg" className="border-fn-accent/20 bg-fn-accent/5">
                <CardHeader title="Sign In Required" subtitle="Sign in to access your personalized training plan" />
                <div className="mt-6">
                    <Link href="/auth?next=/plan"><Button>Sign In</Button></Link>
                </div>
            </Card>
        </PageLayout>
    );

    return (
        <PageLayout title="Training Plan" subtitle={`Week of ${plan?.week_start_local ?? "—"} · Aligned to your schedule`}>
            {/* Header Bar */}
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    {goals.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {goals.map(g => (
                                <span key={g} className="text-[9px] font-black uppercase tracking-[0.25em] bg-fn-accent/10 border border-fn-accent/20 text-fn-accent px-2.5 py-1 rounded-full">
                                    {g}
                                </span>
                            ))}
                        </div>
                    )}
                    {plan && (
                        <p className="mt-2 text-sm font-semibold text-fn-muted">{plan.cycle_goal}</p>
                    )}
                </div>
                <Button
                    variant="secondary"
                    size="sm"
                    loading={regenerating}
                    onClick={() => void regenerate()}
                    icon={
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    }
                >
                    Regenerate Plan
                </Button>
            </div>

            {/* AI Insight Card */}
            <Card padding="lg" className="mb-6 border-fn-accent/20 bg-fn-accent/5">
                <div className="flex items-center gap-3 mb-3">
                    <div className="h-5 w-5 rounded-full bg-fn-accent/20 border border-fn-accent/30 flex items-center justify-center shrink-0">
                        <svg className="h-3 w-3 text-fn-accent" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38l-.001-.001z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.35em] text-fn-accent">AI Weekly Analysis</p>
                </div>
                {aiLoading ? (
                    <div className="space-y-2 animate-pulse">
                        <div className="h-4 w-full rounded-full bg-white/5" />
                        <div className="h-4 w-4/5 rounded-full bg-white/5" />
                        <div className="h-4 w-3/5 rounded-full bg-white/5" />
                    </div>
                ) : aiInsight ? (
                    <p className="text-base font-medium italic text-white leading-relaxed border-l-2 border-fn-accent/30 pl-4">{aiInsight}</p>
                ) : (
                    <p className="text-sm text-fn-muted italic">Log workouts this week to unlock your AI performance analysis.</p>
                )}
                {weekStats && (weekStats.workoutCount > 0 || weekStats.avgCalories != null) && (
                    <div className="mt-4 flex gap-4 flex-wrap">
                        <div className="text-center">
                            <p className="text-xl font-black text-white">{weekStats.workoutCount}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-fn-muted">Sessions This Week</p>
                        </div>
                        {weekStats.avgCalories != null && (
                            <div className="text-center">
                                <p className="text-xl font-black text-white">{weekStats.avgCalories}</p>
                                <p className="text-[9px] font-black uppercase tracking-widest text-fn-muted">Avg Calories</p>
                            </div>
                        )}
                        {weekStats.weightTrend && (
                            <div className="text-center">
                                <p className={`text-xl font-black ${weekStats.weightTrend === "down" ? "text-fn-accent" : weekStats.weightTrend === "up" ? "text-fn-danger" : "text-fn-muted"}`}>
                                    {weekStats.weightTrend === "down" ? "↓" : weekStats.weightTrend === "up" ? "↑" : "→"}
                                </p>
                                <p className="text-[9px] font-black uppercase tracking-widest text-fn-muted">Weight Trend</p>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                {/* Weekly Schedule Grid */}
                <div>
                    {/* Day-of-week header */}
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-muted/60 mb-3">This Week</p>
                    <div className="space-y-2">
                        {plan?.days.map((day) => {
                            const config = INTENSITY_CONFIG[day.intensity];
                            const dayDate = new Date(day.date_local + "T00:00:00");
                            const weekday = dayDate.getDay();
                            const isPreferred = preferredDays.includes(weekday);
                            const today = isToday(day.date_local);
                            const past = isPast(day.date_local);
                            const selected = selectedDay?.date_local === day.date_local;

                            return (
                                <button
                                    key={day.date_local}
                                    onClick={() => setSelectedDay(day)}
                                    className={`w-full text-left rounded-2xl border transition-all duration-200 px-5 py-4 ${selected
                                        ? `${config.border} ${config.bg} ${config.glow}`
                                        : past && !today
                                            ? "border-white/[0.04] bg-white/[0.01] opacity-50"
                                            : "border-white/[0.07] bg-fn-surface/40 hover:bg-fn-surface/60"
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Day + Date */}
                                        <div className={`flex flex-col items-center justify-center rounded-xl w-12 h-12 shrink-0 border ${today ? "bg-fn-accent/15 border-fn-accent/30" : "bg-white/[0.03] border-white/[0.06]"}`}>
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${today ? "text-fn-accent" : "text-fn-muted/50"}`}>
                                                {WEEKDAY_NAMES[weekday]}
                                            </span>
                                            <span className={`text-base font-black leading-none ${today ? "text-fn-accent" : "text-white/70"}`}>
                                                {dayDate.getDate()}
                                            </span>
                                        </div>

                                        {/* Focus */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className={`text-sm font-bold truncate ${past && !today ? "text-white/40" : "text-white"}`}>
                                                    {day.focus}
                                                </p>
                                                {today && <span className="text-[8px] font-black uppercase tracking-widest bg-fn-accent text-black px-2 py-0.5 rounded-full shrink-0">Today</span>}
                                                {!isPreferred && !past && (
                                                    <span className="text-[8px] font-black uppercase tracking-widest bg-white/5 text-white/30 px-2 py-0.5 rounded-full shrink-0">Rest</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                {/* Intensity bar */}
                                                <div className="w-20 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                                    <div className={`h-full rounded-full ${config.bar} ${config.barWidth} transition-all`} />
                                                </div>
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${config.text}`}>{config.label}</span>
                                                <span className="text-[9px] font-bold text-fn-muted/40">·</span>
                                                <span className="text-[9px] font-bold text-fn-muted/60">{day.target_duration_minutes} min</span>
                                            </div>
                                        </div>

                                        {/* Chevron */}
                                        <svg className={`h-4 w-4 shrink-0 transition-transform duration-200 ${selected ? `${config.text} rotate-90` : "text-white/20"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {!plan && (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
                            <p className="text-sm text-fn-muted">No plan generated yet.</p>
                            <Button className="mt-4" onClick={() => void regenerate()} loading={regenerating}>Generate My Plan</Button>
                        </div>
                    )}
                </div>

                {/* Day Detail Panel */}
                <div className="space-y-4">
                    {selectedDay ? (() => {
                        const config = INTENSITY_CONFIG[selectedDay.intensity];
                        const dayDate = new Date(selectedDay.date_local + "T00:00:00");
                        const weekday = dayDate.getDay();
                        const isPreferred = preferredDays.includes(weekday);
                        const today = isToday(selectedDay.date_local);

                        return (
                            <>
                                <div className={`rounded-2xl border p-6 ${config.border} ${config.bg}`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${config.text}`}>
                                                {WEEKDAY_FULL[weekday]}{today ? " — Today" : ""}
                                            </p>
                                            <h2 className="mt-2 text-2xl font-black text-white uppercase italic tracking-tighter leading-tight">
                                                {selectedDay.focus}
                                            </h2>
                                        </div>
                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${config.border}`}>
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${config.text}`}>
                                                {selectedDay.target_duration_minutes}m
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-4 space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold text-fn-muted">Intensity</span>
                                            <span className={`font-black ${config.text}`}>{config.label}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold text-fn-muted">Duration</span>
                                            <span className="font-black text-white">{selectedDay.target_duration_minutes} minutes</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold text-fn-muted">Schedule alignment</span>
                                            <span className={`font-black text-[9px] uppercase tracking-widest ${isPreferred ? "text-fn-accent" : "text-fn-muted/50"}`}>
                                                {isPreferred ? "Preferred Training Day" : "Rest / Light Day"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* AI Rationale */}
                                <div className="rounded-2xl border border-white/[0.07] bg-fn-surface/40 p-5">
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-fn-muted mb-2">AI Rationale</p>
                                    <p className="text-sm text-fn-muted leading-relaxed italic">{selectedDay.rationale}</p>
                                </div>

                                {/* CTAs */}
                                <div className="space-y-2">
                                    {today && (
                                        <Link href="/check-in" className="block">
                                            <Button className="w-full h-11">
                                                Do Today's Check-In
                                            </Button>
                                        </Link>
                                    )}
                                    <Link href="/log/workout" className="block">
                                        <Button variant="secondary" className="w-full h-11">
                                            {today ? "Start Workout Session" : "Log a Workout"}
                                        </Button>
                                    </Link>
                                </div>

                                {/* Preferred days legend */}
                                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-fn-muted mb-3">Your Preferred Training Days</p>
                                    <div className="flex gap-2 flex-wrap">
                                        {WEEKDAY_NAMES.map((name, idx) => {
                                            const dayIdx = idx === 0 ? 0 : idx;
                                            const isActive = preferredDays.includes(dayIdx);
                                            const isCurrentSlot = weekday === dayIdx;
                                            return (
                                                <div
                                                    key={name}
                                                    className={`flex h-8 w-9 flex-col items-center justify-center rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors border ${isCurrentSlot
                                                        ? "bg-fn-accent/15 border-fn-accent/30 text-fn-accent"
                                                        : isActive
                                                            ? "bg-white/[0.06] border-white/[0.08] text-white/70"
                                                            : "bg-transparent border-white/[0.04] text-white/20"
                                                        }`}
                                                >
                                                    {name}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <Link href="/settings" className="mt-3 inline-block">
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-fn-muted/40 hover:text-fn-accent transition-colors">
                                            Edit schedule in Settings →
                                        </p>
                                    </Link>
                                </div>
                            </>
                        );
                    })() : (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
                            <p className="text-sm text-fn-muted">Select a day to see its details.</p>
                        </div>
                    )}
                </div>
            </div>
        </PageLayout>
    );
}
