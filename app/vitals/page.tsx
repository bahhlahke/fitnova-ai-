"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { toLocalDateString } from "@/lib/date/local-date";
import Link from "next/link";
import { PageLayout, LoadingState, Card, CardHeader, Button } from "@/components/ui";
import { DashboardReadinessSection } from "@/components/dashboard/DashboardReadinessSection";
import { calculateReadiness, type MuscleReadiness } from "@/lib/workout/recovery";

export default function VitalsPage() {
    const { user, loading: authLoading } = useAuth();
    const [readiness, setReadiness] = useState<Partial<MuscleReadiness>>({});
    const [readinessInsight, setReadinessInsight] = useState<string | null>(null);
    const [readinessInsightLoading, setReadinessInsightLoading] = useState(false);
    const [recoverySuggestion, setRecoverySuggestion] = useState<string | null>(null);
    const [biometrics, setBiometrics] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadVitals = useCallback(async () => {
        console.log("[vitals] loadVitals triggered", { authLoading, hasUser: !!user });

        if (authLoading) {
            console.log("[vitals] skipping: auth is loading");
            return;
        }

        if (!user) {
            console.log("[vitals] skipping: no user session");
            setLoading(false);
            return;
        }

        if (!user.id) {
            console.error("[vitals] CRITICAL: User object exists but missing ID!", user);
            setError("Authentication synchronization error. Please try again.");
            setLoading(false);
            return;
        }

        const supabase = createClient();
        if (!supabase) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            console.log("[vitals] fetching data for user:", user.id);
            const today = toLocalDateString();

            const [workoutsRes, signalsRes] = await Promise.all([
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
                    .limit(10)
            ]);

            const fetchError = workoutsRes.error || signalsRes.error;
            if (fetchError) throw fetchError;

            if (signalsRes.data) {
                setBiometrics(signalsRes.data);
            }

            const recentWorkouts = workoutsRes.data;
            if (recentWorkouts) {
                console.log("[vitals] data fetched:", recentWorkouts.length, "workouts");
                const calculated = calculateReadiness(recentWorkouts);
                setReadiness(calculated);

                const lastWorkoutDate = recentWorkouts[0]?.date;
                if (lastWorkoutDate) {
                    const daysSinceLast = Math.floor(
                        (new Date(today).setHours(0, 0, 0, 0) - new Date(lastWorkoutDate).setHours(0, 0, 0, 0)) /
                        (24 * 60 * 60 * 1000)
                    );
                    if (daysSinceLast === 0) setRecoverySuggestion("You already trained today.");
                    else if (daysSinceLast === 1) setRecoverySuggestion("You trained yesterday. Active recovery recommended.");
                }
            }
        } catch (err: any) {
            console.error("Vitals load error:", err);
            setError(err.message || "Failed to load vitals.");
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
            const body = await res.json();
            if (body.insight) setReadinessInsight(body.insight);
        } catch (e) { } finally {
            setReadinessInsightLoading(false);
        }
    }, [readiness]);

    useEffect(() => {
        loadVitals();
        const timer = setTimeout(() => {
            setLoading(false);
        }, 3000); // Safety timeout
        return () => clearTimeout(timer);
    }, [loadVitals]);

    useEffect(() => {
        if (!loading) loadInsight();
    }, [loading, loadInsight]);

    return (
        <PageLayout
            title="System Readiness"
            subtitle="Comprehensive physiological signals and musculoskeletal recovery analysis"
        >
            {error && (
                <div className="mb-4 rounded-xl border border-fn-danger/20 bg-fn-danger/5 p-4 text-xs text-fn-danger">
                    Error loading vitals: {error}
                </div>
            )}
            {loading ? (
                <LoadingState message="Analyzing biological signals..." />
            ) : !user ? (
                <div className="max-w-4xl space-y-6">
                    <Card padding="lg" className="border-fn-accent/20 bg-fn-accent/5">
                        <CardHeader title="Intelligence Access Required" subtitle="Sign in to analyze your physiological signals" />
                        <p className="mt-4 text-fn-muted leading-relaxed">
                            To provide personalized readiness insights and muscle stress analysis, Koda AI needs access to your training history and biometric data.
                        </p>
                        <div className="mt-8 flex flex-col sm:flex-row gap-4">
                            <Link href="/auth?next=/vitals">
                                <Button className="w-full sm:w-auto px-8">Sign In to Continue</Button>
                            </Link>
                            <Link href="/start">
                                <Button variant="secondary" className="w-full sm:w-auto px-8">Start Assessment</Button>
                            </Link>
                        </div>
                    </Card>
                </div>
            ) : (
                <div className="max-w-4xl">
                    <div className="mb-6 flex justify-end">
                        <Link href="/integrations">
                            <Button variant="secondary" size="sm" className="gap-2">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                Connect Wearables
                            </Button>
                        </Link>
                    </div>

                    {biometrics.length > 0 && (
                        <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
                            {biometrics[0].hrv && (
                                <Card padding="default" className="bg-black/40">
                                    <p className="text-[10px] uppercase font-black tracking-widest text-fn-muted mb-1">HRV</p>
                                    <p className="text-2xl font-black text-white">{Math.round(biometrics[0].hrv)} <span className="text-xs text-fn-muted">ms</span></p>
                                </Card>
                            )}
                            {biometrics[0].sleep_deep_hours && (
                                <Card padding="default" className="bg-black/40">
                                    <p className="text-[10px] uppercase font-black tracking-widest text-fn-muted mb-1">Deep Sleep</p>
                                    <p className="text-2xl font-black text-white">{biometrics[0].sleep_deep_hours.toFixed(1)} <span className="text-xs text-fn-muted">hrs</span></p>
                                </Card>
                            )}
                            {biometrics[0].blood_glucose_avg && (
                                <Card padding="default" className="bg-black/40">
                                    <p className="text-[10px] uppercase font-black tracking-widest text-fn-muted mb-1">Avg Glucose</p>
                                    <p className="text-2xl font-black text-white">{Math.round(biometrics[0].blood_glucose_avg)} <span className="text-xs text-fn-muted">mg/dL</span></p>
                                </Card>
                            )}
                            {biometrics[0].strain_score && (
                                <Card padding="default" className="bg-black/40">
                                    <p className="text-[10px] uppercase font-black tracking-widest text-fn-muted mb-1">Strain</p>
                                    <p className="text-2xl font-black text-white">{biometrics[0].strain_score.toFixed(1)}</p>
                                </Card>
                            )}
                            {biometrics[0].spo2_avg && (
                                <Card padding="default" className="bg-black/40">
                                    <p className="text-[10px] uppercase font-black tracking-widest text-fn-muted mb-1">SpO2 (Blood O2)</p>
                                    <p className="text-2xl font-black text-white">{Math.round(biometrics[0].spo2_avg)}<span className="text-xs text-fn-muted">%</span></p>
                                </Card>
                            )}
                            {biometrics[0].respiratory_rate_avg && (
                                <Card padding="default" className="bg-black/40">
                                    <p className="text-[10px] uppercase font-black tracking-widest text-fn-muted mb-1">Resp. Rate</p>
                                    <p className="text-2xl font-black text-white">{biometrics[0].respiratory_rate_avg.toFixed(1)} <span className="text-xs text-fn-muted">rpm</span></p>
                                </Card>
                            )}
                        </div>
                    )}

                    <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
                        <div className="space-y-4">
                            <Card padding="default" className="border-fn-accent/20 bg-fn-accent/5 hover:bg-fn-accent/10 transition-colors">
                                <Link href="/vitals/cycle" className="block w-full">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-fn-accent mb-1">Hormonal Phase</p>
                                            <p className="text-sm font-semibold text-fn-ink">Log Cycle Data</p>
                                        </div>
                                        <svg className="h-5 w-5 text-fn-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                    <p className="text-xs text-fn-muted mt-2">Adapt your training volume to your physiology.</p>
                                </Link>
                            </Card>
                        </div>
                        <DashboardReadinessSection
                            readiness={readiness}
                            readinessInsight={readinessInsight}
                            readinessInsightLoading={readinessInsightLoading}
                            recoverySuggestion={recoverySuggestion}
                        />
                    </div>
                </div>
            )}
        </PageLayout>
    );
}
