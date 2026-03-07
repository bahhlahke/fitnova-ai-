import { createClient } from "@/lib/supabase/server";

// Using the Brzycki Formula
export function calculateEst1RM(weightKg: number, reps: number): number {
    if (reps <= 1) return weightKg;
    return weightKg / (1.0278 - 0.0278 * reps);
}

export async function processPRs(userId: string) {
    const supabase = await createClient();

    // Load user's recent workouts or all if needed to recalculate
    const { data: workouts, error } = await supabase
        .from("workout_logs")
        .select("exercises, date")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(50); // Just scan the last 50 workouts for any new PRs

    if (error || !workouts) return;

    const prCandidates = new Map<string, { exercise_id: string, exercise_name: string, max_weight: number, highest_1rm: number }>();

    for (const log of workouts) {
        if (!log.exercises || !Array.isArray(log.exercises)) continue;

        for (const ex of log.exercises) {
            if (!ex.name || !ex.weight || !ex.reps) continue;
            const weight = typeof ex.weight === 'string' ? parseFloat(ex.weight) : ex.weight as number;
            const repsStr = String(ex.reps);
            const reps = parseInt(repsStr.split('-')[0], 10) || parseInt(repsStr, 10);

            if (!weight || !reps || Number.isNaN(weight) || Number.isNaN(reps)) continue;

            const est1RM = calculateEst1RM(weight, reps);
            const exerciseId = ex.name.toLowerCase().replace(/[^a-z0-9]/g, '_');

            const existing = prCandidates.get(exerciseId);
            if (!existing || est1RM > existing.highest_1rm) {
                prCandidates.set(exerciseId, {
                    exercise_id: exerciseId,
                    exercise_name: ex.name,
                    max_weight: weight,
                    highest_1rm: est1RM
                });
            }
        }
    }

    // Load existing PRs from DB to only update if beaten
    const { data: currentPrs } = await supabase
        .from("exercise_prs")
        .select("exercise_id, highest_1rm")
        .eq("user_id", userId);

    const currentMap = new Map((currentPrs ?? []).map((pr: any) => [pr.exercise_id, pr.highest_1rm]));

    const upserts = [];
    for (const candidate of Array.from(prCandidates.values())) {
        const current1RM = currentMap.get(candidate.exercise_id) ?? 0;
        if (candidate.highest_1rm > current1RM) {
            upserts.push({
                user_id: userId,
                exercise_id: candidate.exercise_id,
                exercise_name: candidate.exercise_name,
                max_weight: candidate.max_weight,
                highest_1rm: candidate.highest_1rm,
                last_achieved_at: new Date().toISOString()
            });
        }
    }

    if (upserts.length > 0) {
        await supabase.from("exercise_prs").upsert(upserts, { onConflict: "user_id, exercise_id" });
    }
}
