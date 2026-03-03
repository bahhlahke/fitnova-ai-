import { createClient } from "@/lib/supabase/server";

export async function checkAndAwardBadges(userId: string) {
    const supabase = await createClient();

    // 1. Fetch earned badges to avoid duplicates
    const { data: earned } = await supabase
        .from("user_badges")
        .select("badge_id")
        .eq("user_id", userId);

    const earnedIds = new Set(earned?.map(e => e.badge_id) || []);

    // 2. Fetch all badge definitions
    const { data: definitions } = await supabase.from("badge_definitions").select("*");
    if (!definitions) return;

    for (const badge of definitions) {
        if (earnedIds.has(badge.id)) continue;

        const criteria = badge.criteria_json as any;
        let awarded = false;

        if (criteria.type === "streak") {
            // Logic for streak (requires checking daily_plans or workout_logs)
            const { count } = await supabase
                .from("workout_logs")
                .select("*", { count: "exact", head: true })
                .eq("user_id", userId)
                .gte("date", new Date(Date.now() - criteria.days * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);

            if (count && count >= criteria.days) awarded = true;
        }

        if (criteria.type === "time") {
            // Check if any workout was logged before a certain time
            const { data: logs } = await supabase
                .from("workout_logs")
                .select("created_at")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(10);

            awarded = logs?.some(log => {
                const time = new Date(log.created_at).toLocaleTimeString("en-US", { hour12: false });
                return time < criteria.before;
            }) || false;
        }

        if (awarded) {
            await supabase.from("user_badges").insert({
                user_id: userId,
                badge_id: badge.id
            });
        }
    }

    // 3. Calculate XP
    let newXp = 0;

    // 100 XP per workout log in last 24h
    const { count: workoutCount } = await supabase
        .from("workout_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    newXp += (workoutCount || 0) * 100;

    // 20 XP per meal logged today
    const { data: nutritionLog } = await supabase
        .from("nutrition_logs")
        .select("meals")
        .eq("user_id", userId)
        .eq("date", new Date().toISOString().split("T")[0])
        .maybeSingle();

    if (nutritionLog?.meals) {
        newXp += (nutritionLog.meals.length || 0) * 20;
    }

    // Social Post for Workout
    if (workoutCount && workoutCount > 0) {
        await supabase.from("social_posts").insert({
            user_id: userId,
            type: "workout",
            content: `Just crushed a workout!`,
            metadata: { count: workoutCount }
        });
    }

    // Update profile XP
    if (newXp > 0) {
        const { data: profile } = await supabase.from("user_profile").select("xp, name").eq("user_id", userId).single();
        const currentXp = profile?.xp || 0;
        await supabase.from("user_profile").update({ xp: currentXp + 10 }).eq("user_id", userId);
    }
}
