import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Mock Vibes Feed for the specific squad
    // In a real implementation, we'd query social_posts or an activity_feed table filtered by squad_id.
    const vibes = [
        {
            id: "1",
            userName: "Alex K.",
            type: "PR",
            message: "Crushed a 315lb Bench PR in Rogue Hybrid!",
            time: "2h ago",
        },
        {
            id: "2",
            userName: "Sarah J.",
            type: "Streak",
            message: "10-day consistency streak unlocked.",
            time: "4h ago",
        },
        {
            id: "3",
            userName: "Coach Koda",
            type: "Insight",
            message:
                "Titanium Hypertrophy volume is up 12% this week. Keep pushing.",
            time: "6h ago",
        },
        {
            id: "4",
            userName: "Mike R.",
            type: "Workout",
            message: "Just finished morning mobility session.",
            time: "8h ago",
        },
    ];

    return NextResponse.json({ vibes });
}
