import type { SupabaseClient } from "@supabase/supabase-js";
import { processPRs } from "../analytics/pr-engine";
import { storeMemory } from "../ai/memory";

export async function processSession(supabase: SupabaseClient, userId: string, dateLocal: string) {
    // 1. Process PRs (this already includes beaten PR memory storage)
    await processPRs(userId);

    // 2. Extract significant session summary for long-term memory
    const { data: workouts } = await supabase
        .from("workout_logs")
        .select("workout_type, duration_minutes, exercises, notes")
        .eq("user_id", userId)
        .eq("date", dateLocal)
        .order("created_at", { ascending: false })
        .limit(1);

    if (workouts && workouts.length > 0) {
        const workout = workouts[0];
        const exerciseNames = (workout.exercises as any[])?.map(e => e.name).join(", ");
        const content = `Completed a ${workout.workout_type} session (${workout.duration_minutes ?? "?"} min) focusing on: ${exerciseNames || "unspecified movement"}. Notes: ${workout.notes || "None"}.`;
        
        await storeMemory(supabase, userId, content, {
            type: "workout",
            date: dateLocal,
            workout_type: workout.workout_type
        });
    }

    // 3. Trigger award check (can be done here or in the API)
    // For now, assume APIs call awards/check separately as per existing code
}
