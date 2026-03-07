"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { toLocalDateString } from "@/lib/date/local-date";
import Link from "next/link";
import { PageLayout, LoadingState, Card, CardHeader, Button } from "@/components/ui";
import { DashboardReadinessSection } from "@/components/dashboard/DashboardReadinessSection";
import { calculateReadiness, type MuscleReadiness } from "@/lib/workout/recovery";

type BiometricSignal = {
    hrv?: number | null;
    sleep_deep_hours?: number | null;
    sleep_hours?: number | null;
    blood_glucose_avg?: number | null;
    strain_score?: number | null;
    spo2_avg?: number | null;
    respiratory_rate_avg?: number | null;
    resting_hr?: number | null;
    recovery_score?: number | null;
    signal_date?: string | null;
    provider?: string | null;
};

export default function VitalsPage() {
    const { user, loading: authLoading } = useAuth();
    const [readiness, setReadiness] = useState<Partial<MuscleReadiness>>({});
    const [readinessInsight, setReadinessInsight] = useState<string | null>(null);
    const [readinessInsightLoading, setReadinessInsightLoading] = useState(false);
    const [recoverySuggestion, setRecoverySuggestion] = useState<string | null>(null);
    const [biometrics, setBiometrics] = useState<BiometricSignal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sex, setSex] = useState<string | null>(null);

    const loadVitals = useCallback(async () => {
        if (authLoading) return;
        if (!user) { setLoading(false); return; }

        const supabase = createClient();
        if (!supabase) { setLoading(false); return; }

        setLoading(true);
        try {
            const today = toLocalDateString();
            const [workoutsRes, signalsRes, profileRes] = await Promise.all([
                supabase
                    .from("workout_logs")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("date", { ascending: false })
                    .limit(28),
                supabase
                    .from("connected_signals")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("signal_date", { ascending: false })
                    .limit(10),
                supabase
                    .from("user_profile")
                    .select("sex")
                    .eq("user_id", user.id)
                    .maybeSingle()
            ]);

            if (profileRes.data?.sex) {
                setSex(profileRes.data.sex);
            }

            if (signalsRes.data) {
                setBiometrics(signalsRes.data as BiometricSignal[]);
            }

            const recentWorkouts = workoutsRes.data;
            if (recentWorkouts) {
                const calculated = calculateReadiness(recentWorkouts);
                setReadiness(calculated);

                const lastWorkoutDate = recentWorkouts[0]?.date;
                if (lastWorkoutDate) {
                    const daysSinceLast = Math.floor(
                        (new Date(today).setHours(0, 0, 0, 0) - new Date(lastWorkoutDate).setHours(0, 0, 0, 0)) /
                        (24 * 60 * 60 * 1000)
                    );
                    if (daysSinceLast === 0) setRecoverySuggestion("You trained today. Prioritize nutrition and sleep.");
                    else if (daysSinceLast === 1) setRecoverySuggestion("Trained yesterday. Active recovery recommended.");
                }
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to load vitals.");
        } finally {
            setLoading(false);
        }
    }, [user, authLoading]);

    const loadInsight = useCallback(async () => {
        if (Object.keys(readiness).length === 0) return;
        setReadinessInsightLoading(true);
        try {
            const res = await fetch("/api/v1/ai/readiness-insight", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ localDate: toLocalDateString(), readiness }),
            });
            const body = await res.json() as { insight?: string };
            if (body.insight) setReadinessInsight(body.insight);
        } catch { /* degraded AI */ } finally {
            setReadinessInsightLoading(false);
        }
    }, [readiness]);

    useEffect(() => {
        void loadVitals();
        const timer = setTimeout(() => setLoading(false), 4000);
        return () => clearTimeout(timer);
    }, [loadVitals]);

    useEffect(() => {
        if (!loading) void loadInsight();
    }, [loading, loadInsight]);

    const latest = biometrics[0];

    const isFemale = sex === "female" || sex === "Female" || sex === "F" || sex === "f";

    const statCards: Array<{ label: string; value: string | number; unit: string; icon: string }> = [];
    if (latest) {
        if (latest.hrv != null) statCards.push({ label: "Heart Rate Variability", value: Math.round(latest.hrv), unit: "ms", icon: "💚" });
        if (latest.resting_hr != null) statCards.push({ label: "Resting Heart Rate", value: Math.round(latest.resting_hr), unit: "bpm", icon: "❤️" });
        if (latest.sleep_hours != null) statCards.push({ label: "Total Sleep", value: latest.sleep_hours.toFixed(1), unit: "hrs", icon: "🌙" });
        if (latest.sleep_deep_hours != null) statCards.push({ label: "Deep Sleep", value: latest.sleep_deep_hours.toFixed(1), unit: "hrs", icon: "💤" });
        if (latest.spo2_avg != null) statCards.push({ label: "Blood Oxygen (SpO2)", value: Math.round(latest.spo2_avg), unit: "%", icon: "🫁" });
        if (latest.respiratory_rate_avg != null) statCards.push({ label: "Respiratory Rate", value: latest.respiratory_rate_avg.toFixed(1), unit: "rpm", icon: "🌬️" });
        if (latest.blood_glucose_avg != null) statCards.push({ label: "Avg Glucose", value: Math.round(latest.blood_glucose_avg), unit: "mg/dL", icon: "🩸" });
        if (latest.strain_score != null) statCards.push({ label: "Training Strain", value: latest.strain_score.toFixed(1), unit: "", icon: "⚡" });
        if (latest.recovery_score != null) statCards.push({ label: "Recovery Score", value: Math.round(latest.recovery_score), unit: "%", icon: "♻️" });
    }

    return (
        <PageLayout
            title="Performance Readiness"
            subtitle="Physiological signals and musculoskeletal recovery analysis"
        >
            {error && (
                <div className="mb-4 rounded-xl border border-fn-danger/20 bg-fn-danger/5 p-4 text-xs text-fn-danger">
                    {error}
                </div>
            )}
            {loading ? (
                <LoadingState message="Analyzing biological signals..." />
            ) : !user ? (
                <div className="max-w-4xl space-y-6">
                    <Card padding="lg" className="border-fn-accent/20 bg-fn-accent/5">
                        <CardHeader title="Sign In Required" subtitle="Sign in to view your physiological signals" />
                        <div className="mt-8 flex flex-col sm:flex-row gap-4">
                            <Link href="/auth?next=/vitals">
                                <Button className="w-full sm:w-auto px-8">Sign In</Button>
                            </Link>
                            <Link href="/start">
                                <Button variant="secondary" className="w-full sm:w-auto px-8">Start Assessment</Button>
                            </Link>
                        </div>
                    </Card>
                </div>
            ) : (
                <div className="max-w-4xl space-y-6">
                    {/* Header actions */}
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-fn-muted">
                            {biometrics.length > 0
                                ? `Last synced: ${latest?.signal_date && new Date(latest.signal_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} via ${latest?.provider ?? "wearable"}`
                                : "No wearable data yet — connect a device below"}
                        </p>
                        <Link href="/integrations">
                            <Button variant="secondary" size="sm" className="gap-2">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                Connect Wearables
                            </Button>
                        </Link>
                    </div>

                    {/* Live biometric stat grid */}
                    {statCards.length > 0 ? (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-accent mb-3">Live Readings</p>
                            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                                {statCards.map((stat) => (
                                    <div
                                        key={stat.label}
                                        className="rounded-2xl border border-white/[0.07] bg-fn-surface/60 p-4 hover:bg-fn-surface/80 transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-lg">{stat.icon}</span>
                                            {stat.unit && (
                                                <span className="text-[9px] font-black uppercase tracking-widest text-fn-muted/50">{stat.unit}</span>
                                            )}
                                        </div>
                                        <p className="text-2xl font-black text-white leading-none">{stat.value}</p>
                                        <p className="mt-1.5 text-[9px] font-bold uppercase tracking-widest text-fn-muted leading-tight">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
                            <p className="text-sm text-fn-muted">No wearable data available yet.</p>
                            <p className="mt-1 text-xs text-fn-muted/60">Connect a device via the Open Wearables dashboard to see live biometric readings here.</p>
                            <Link href="/integrations" className="mt-4 inline-block">
                                <Button size="sm">Connect a Device</Button>
                            </Link>
                        </div>
                    )}

                    {/* Main readiness section */}
                    <DashboardReadinessSection
                        readiness={readiness}
                        readinessInsight={readinessInsight}
                        readinessInsightLoading={readinessInsightLoading}
                        recoverySuggestion={recoverySuggestion}
                    />

                    {/* Hormonal Phase — females only */}
                    {isFemale && (
                        <Card padding="default" className="border-fn-accent/20 bg-fn-accent/5 hover:bg-fn-accent/10 transition-colors">
                            <Link href="/vitals/cycle" className="block w-full">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-fn-accent mb-1">Hormonal Phase</p>
                                        <p className="text-sm font-semibold text-fn-ink">Log Cycle Data →</p>
                                        <p className="text-xs text-fn-muted mt-1">Adapt training volume to your menstrual phase.</p>
                                    </div>
                                    <svg className="h-6 w-6 text-fn-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </Link>
                        </Card>
                    )}
                </div>
            )}
        </PageLayout>
    );
}
