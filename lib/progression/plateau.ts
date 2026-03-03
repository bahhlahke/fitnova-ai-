import { createClient } from "@/lib/supabase/server";

interface PlateauResult {
    is_plateau: boolean;
    type?: "fatigue" | "stimulus";
    reason?: string;
    suggestion?: string;
    metrics: any;
}

// Calculate Estimated 1-Rep Max using the Epley formula
function calcE1RM(weight: number, reps: number): number {
    if (reps === 1) return weight;
    return weight * (1 + reps / 30);
}

export async function detectPlateaus(userId: string): Promise<PlateauResult> {
    const supabase = await createClient();

    // Fetch last 6 weeks of workout logs for better trend analysis
    const sixWeeksAgo = new Date();
    sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);

    const { data: logs } = await supabase
        .from("workout_logs")
        .select("created_at, workout_json")
        .eq("user_id", userId)
        .gte("created_at", sixWeeksAgo.toISOString())
        .order("created_at", { ascending: false });

    if (!logs || logs.length < 10) {
        return { is_plateau: false, metrics: {} };
    }

    // Group by week (0 = current week, 5 = 6 weeks ago)
    const weeklyMetrics = Array.from({ length: 6 }, () => ({
        volumeLoad: 0,
        coreLiftsE1RM: [] as number[],
        avgE1RM: 0
    }));

    const coreLifts = ["squat", "bench press", "deadlift", "overhead press"];

    logs.forEach(log => {
        const weekIdx = Math.floor((new Date().getTime() - new Date(log.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000));
        if (weekIdx >= 0 && weekIdx < 6) {
            (log.workout_json as any)?.exercises?.forEach((ex: any) => {
                const exName = ex.name.toLowerCase();
                const isCore = coreLifts.some(l => exName.includes(l));

                ex.sets?.forEach((s: any) => {
                    const weight = s.weight || 0;
                    const reps = s.reps || 0;
                    if (weight > 0 && reps > 0) {
                        weeklyMetrics[weekIdx].volumeLoad += weight * reps;

                        // We only track e1RM for big compound movements
                        if (isCore) {
                            weeklyMetrics[weekIdx].coreLiftsE1RM.push(calcE1RM(weight, reps));
                        }
                    }
                });
            });
        }
    });

    // Calculate average e1RM per week
    weeklyMetrics.forEach(week => {
        if (week.coreLiftsE1RM.length > 0) {
            week.avgE1RM = week.coreLiftsE1RM.reduce((a, b) => a + b, 0) / week.coreLiftsE1RM.length;
        }
    });

    // We need at least 3 recent weeks of data to detect a trend
    if (weeklyMetrics[0].volumeLoad === 0 || weeklyMetrics[1].volumeLoad === 0 || weeklyMetrics[2].volumeLoad === 0) {
        return { is_plateau: false, metrics: weeklyMetrics.map(w => ({ volume: w.volumeLoad, e1rm: w.avgE1RM })) };
    }

    // Is e1RM flat or decreasing over the last 3 weeks? (Allowing a 2% margin)
    const recentE1RM = weeklyMetrics.slice(0, 3).map(w => w.avgE1RM);
    const isE1RMStalled = (recentE1RM[0] <= recentE1RM[1] * 1.02) && (recentE1RM[1] <= recentE1RM[2] * 1.02);

    if (isE1RMStalled && recentE1RM[1] > 0) {
        // Trend Analysis
        const recentVolume = weeklyMetrics.slice(0, 3).map(w => w.volumeLoad);
        const volumeTrend = recentVolume[0] > recentVolume[2] ? "increasing" : "decreasing"; // 0 is newest

        if (volumeTrend === "increasing") {
            return {
                is_plateau: true,
                type: "fatigue",
                reason: "Your estimated 1-Rep Max has stalled despite increasing training volume.",
                suggestion: "This indicates a Fatigue Plateau. You need to dissipate accumulated fatigue. Consider taking a Deload week, reducing volume by 40-50% while maintaining intensity.",
                metrics: weeklyMetrics.map(w => ({ volume: w.volumeLoad, e1rm: Math.round(w.avgE1RM) }))
            };
        } else {
            return {
                is_plateau: true,
                type: "stimulus",
                reason: "Your estimated 1-Rep Max has stalled alongside decreasing training volume.",
                suggestion: "This indicates a Stimulus Plateau. You've adapted to your current workload. Consider increasing training volume, frequency, or switching to a new periodization block (e.g., Hypertrophy).",
                metrics: weeklyMetrics.map(w => ({ volume: w.volumeLoad, e1rm: Math.round(w.avgE1RM) }))
            };
        }
    }

    return {
        is_plateau: false,
        metrics: weeklyMetrics.map(w => ({ volume: w.volumeLoad, e1rm: Math.round(w.avgE1RM) }))
    };
}
