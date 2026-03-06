"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toLocalDateString } from "@/lib/date/local-date";
import Link from "next/link";
import { PageLayout, LoadingState, Card, CardHeader, Button } from "@/components/ui";
import { DashboardReadinessSection } from "@/components/dashboard/DashboardReadinessSection";
import { calculateReadiness, type MuscleReadiness } from "@/lib/workout/recovery";

export default function VitalsPage() {
    const [readiness, setReadiness] = useState<Partial<MuscleReadiness>>({});
    const [readinessInsight, setReadinessInsight] = useState<string | null>(null);
    const [readinessInsightLoading, setReadinessInsightLoading] = useState(false);
    const [recoverySuggestion, setRecoverySuggestion] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadVitals = useCallback(async () => {
        const supabase = createClient();
        if (!supabase) return;

        setLoading(true);
        try {
            const { data: { user: sessionUser } } = await supabase.auth.getUser();
            if (!sessionUser) {
                setUser(null);
                setLoading(false);
                return;
            }
            setUser(sessionUser);

            const today = toLocalDateString();
            const { data: recentWorkouts } = await supabase
                .from("workout_logs")
                .select("*")
                .eq("user_id", user.id)
                .order("date", { ascending: false })
                .limit(28);

            if (recentWorkouts) {
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
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

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
