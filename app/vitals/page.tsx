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
            const { data: recentWorkouts, error: fetchError } = await supabase
                .from("workout_logs")
                .select("*")
                .eq("user_id", user.id)
                .order("date", { ascending: false })
                .limit(28);

            if (fetchError) throw fetchError;

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
                    <DashboardReadinessSection
                        readiness={readiness}
                        readinessInsight={readinessInsight}
                        readinessInsightLoading={readinessInsightLoading}
                        recoverySuggestion={recoverySuggestion}
                    />
                </div>
            )}
        </PageLayout>
    );
}
