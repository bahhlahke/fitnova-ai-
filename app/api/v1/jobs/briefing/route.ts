import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateEvolutionaryBriefing } from "@/lib/ai/briefing";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/jobs/briefing
 * Triggered by cron or manual request to generate daily briefings for active users.
 */
export async function POST(req: Request) {
    // Basic security check (e.g., internal service key)
    const authHeader = req.headers.get("Authorization");
    const isCron = req.headers.get("X-Cron-Request") === "true";
    
    if (!isCron && authHeader !== `Bearer ${process.env.INTERNAL_JOB_KEY}`) {
        // For development, allow if service role is available
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    
    // Fetch users who need a briefing (e.g., active in the last 24h)
    // For now, we'll just expose it as an endpoint that can be called for a specific user or all.
    const { data: users, error } = await supabase
        .from("user_profile")
        .select("user_id")
        .limit(20); // Batch for now

    if (error || !users) {
        return NextResponse.json({ error: "Failed to find users" }, { status: 500 });
    }

    const results = [];
    for (const u of users) {
        try {
            const briefing = await generateEvolutionaryBriefing(u.user_id);
            results.push({ user_id: u.user_id, success: true });
        } catch (e) {
            results.push({ user_id: u.user_id, success: false, error: String(e) });
        }
    }

    return NextResponse.json({ processed: results.length, details: results });
}
