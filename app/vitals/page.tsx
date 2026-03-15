"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { toLocalDateString } from "@/lib/date/local-date";
import Link from "next/link";
import { PageLayout, LoadingState, Card, CardHeader, Button } from "@/components/ui";
import { DashboardReadinessSection } from "@/components/dashboard/DashboardReadinessSection";
import { calculateReadiness, type MuscleReadiness, RECOVERY_WINDOW_DAYS, getRecoverySuggestion as getSharedRecoverySuggestion } from "@/lib/workout/recovery";
import { 
    Activity, 
    Zap, 
    Moon, 
    Heart, 
    Droplets, 
    Wind, 
    RefreshCcw, 
    Link as LinkIcon, 
    ChevronRight,
    Brain,
    Info
} from "lucide-react";

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
                    .gte("date", toLocalDateString(new Date(new Date().setDate(new Date().getDate() - RECOVERY_WINDOW_DAYS))))
                    .order("date", { ascending: false }),
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
                setRecoverySuggestion(getSharedRecoverySuggestion(recentWorkouts));
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

    const statCards: Array<{ label: string; value: string | number; unit: string; icon: any; color: string }> = [];
    if (latest) {
        if (latest.hrv != null) statCards.push({ label: "HRV", value: Math.round(latest.hrv), unit: "ms", icon: Activity, color: "text-fn-accent" });
        if (latest.resting_hr != null) statCards.push({ label: "Resting HR", value: Math.round(latest.resting_hr), unit: "bpm", icon: Heart, color: "text-rose-500" });
        if (latest.sleep_hours != null) statCards.push({ label: "Total Sleep", value: latest.sleep_hours.toFixed(1), unit: "hrs", icon: Moon, color: "text-indigo-400" });
        if (latest.recovery_score != null) statCards.push({ label: "Recovery", value: Math.round(latest.recovery_score), unit: "%", icon: RefreshCcw, color: "text-emerald-400" });
        if (latest.spo2_avg != null) statCards.push({ label: "SpO2", value: Math.round(latest.spo2_avg), unit: "%", icon: Wind, color: "text-sky-400" });
        if (latest.respiratory_rate_avg != null) statCards.push({ label: "Resp Rate", value: latest.respiratory_rate_avg.toFixed(1), unit: "rpm", icon: Activity, color: "text-violet-400" });
        if (latest.blood_glucose_avg != null) statCards.push({ label: "Avg Glucose", value: Math.round(latest.blood_glucose_avg), unit: "mg/dL", icon: Droplets, color: "text-orange-400" });
        if (latest.strain_score != null) statCards.push({ label: "Strain", value: latest.strain_score.toFixed(1), unit: "", icon: Zap, color: "text-amber-400" });
    }

    return (
        <PageLayout
            title="Performance Readiness"
            subtitle="Physiological signals and musculoskeletal recovery analysis"
        >
            {error && (
                <div className="mb-4 animate-panel-rise rounded-xl border border-fn-danger/20 bg-fn-danger/5 p-4 text-xs text-fn-danger backdrop-blur-md">
                    <Info className="h-4 w-4 inline mr-2" />
                    {error}
                </div>
            )}
            {loading ? (
                <div className="min-h-[400px] flex items-center justify-center">
                    <LoadingState message="Analyzing biological signals..." />
                </div>
            ) : !user ? (
                <div className="max-w-4xl space-y-6 animate-panel-rise">
                    <Card padding="lg" className="premium-panel border-fn-accent/20 bg-fn-accent/5">
                        <CardHeader title="Sign In Required" subtitle="Sign in to view your physiological signals" />
                        <div className="mt-8 flex flex-col sm:flex-row gap-4">
                            <Link href="/auth?next=/vitals">
                                <Button className="w-full sm:w-auto px-8 shadow-[0_0_20px_rgba(10,217,196,0.3)]">Sign In</Button>
                            </Link>
                            <Link href="/start">
                                <Button variant="secondary" className="w-full sm:w-auto px-8">Start Assessment</Button>
                            </Link>
                        </div>
                    </Card>
                </div>
            ) : (
                <div className="max-w-4xl space-y-8 animate-panel-rise">
                    {/* Header actions */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-fn-accent animate-pulse shadow-[0_0_8px_rgba(10,217,196,1)]" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                                {biometrics.length > 0
                                    ? `SYNCED FROM ${latest?.provider ?? "WEARABLE"}`
                                    : "WAITING FOR WEARABLE SYNC"}
                            </p>
                        </div>
                        <Link href="/integrations">
                            <Button variant="secondary" size="sm" className="gap-2 bg-white/5 border-white/10 hover:bg-white/10 transition-all">
                                <LinkIcon className="h-3 w-3" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Connect</span>
                            </Button>
                        </Link>
                    </div>

                    {/* Live biometric stat grid */}
                    {statCards.length > 0 ? (
                        <div className="space-y-4">
                            <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                                {statCards.map((stat, idx) => (
                                    <div
                                        key={stat.label}
                                        className="premium-panel-soft p-5 group hover:border-fn-accent/30 transition-all duration-300 relative overflow-hidden"
                                        style={{ animationDelay: `${idx * 50}ms` }}
                                    >
                                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <stat.icon className={`h-12 w-12 ${stat.color}`} />
                                        </div>
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-2 mb-3">
                                                <stat.icon className={`h-4 w-4 ${stat.color} drop-shadow-[0_0_8px_currentColor]`} />
                                                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white/40">{stat.label}</span>
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <p className="text-3xl font-black text-white tracking-tighter leading-none">{stat.value}</p>
                                                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{stat.unit}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="premium-panel border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
                            <Activity className="h-10 w-10 text-white/10 mx-auto mb-4" />
                            <p className="text-sm font-bold text-white/60">No wearable data available yet.</p>
                            <p className="mt-1 text-xs text-white/30 max-w-xs mx-auto">Connect a device via the Integrations dashboard to see live biometric readings here.</p>
                            <Link href="/integrations" className="mt-6 inline-block">
                                <Button size="sm">Connect a Device</Button>
                            </Link>
                        </div>
                    )}

                    {/* Main readiness section */}
                    <div className="grid gap-6 lg:grid-cols-1">
                        <DashboardReadinessSection
                            readiness={readiness}
                            readinessInsight={readinessInsight}
                            readinessInsightLoading={readinessInsightLoading}
                            recoverySuggestion={recoverySuggestion}
                        />
                    </div>

                    {/* Hormonal Phase — females only */}
                    {isFemale && (
                        <div className="premium-panel bg-fn-accent/5 border-fn-accent/20 hover:bg-fn-accent/10 transition-all group overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-fn-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Link href="/vitals/cycle" className="block p-6">
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-fn-accent/10 flex items-center justify-center border border-fn-accent/20 group-hover:scale-110 transition-transform">
                                            <Droplets className="h-6 w-6 text-fn-accent" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fn-accent mb-1">Cycle Tracking</p>
                                            <h3 className="text-lg font-black text-white italic tracking-tight">Hormonal Phase Optimization</h3>
                                            <p className="text-xs text-white/40 mt-1">Adapt training volume to your menstrual phase for peak performance.</p>
                                        </div>
                                    </div>
                                    <div className="h-10 w-10 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-fn-accent group-hover:border-fn-accent group-hover:text-black transition-all">
                                        <ChevronRight className="h-5 w-5" />
                                    </div>
                                </div>
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </PageLayout>
    );
}
