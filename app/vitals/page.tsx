"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toLocalDateString } from "@/lib/date/local-date";
import { PageLayout, LoadingState } from "@/components/ui";
import { DashboardReadinessSection } from "@/components/dashboard/DashboardReadinessSection";
import { calculateReadiness, type MuscleReadiness } from "@/lib/workout/recovery";

export default function VitalsPage() {
    const [readiness, setReadiness] = useState<Partial<MuscleReadiness>>({});
    const [readinessInsight, setReadinessInsight] = useState<string | null>(null);
    const [readinessInsightLoading, setReadinessInsightLoading] = useState(false);
    const [recoverySuggestion, setRecoverySuggestion] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const loadVitals = useCallback(async () => {
        const supabase = createClient();
        if (!supabase) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

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
        setLoading(false);
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
    }, [loadVitals]);

    useEffect(() => {
        if (!loading) loadInsight();
    }, [loading, loadInsight]);

    return (
        <PageLayout
            title="System Readiness"
            subtitle="Comprehensive physiological signals and musculoskeletal recovery analysis"
        >
            {loading ? (
                <LoadingState message="Analyzing biological signals..." />
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
