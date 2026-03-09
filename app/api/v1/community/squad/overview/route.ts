import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get user's squad from onboarding
    const { data: onboarding } = await supabase
        .from("onboarding")
        .select("responses")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    const squadId = (onboarding?.responses as any)?.squad || "hybrid";

    // Get squad leaderboard (mocking for now with top users from profile)
    const { data: profiles } = await supabase
        .from("user_profile")
        .select("user_id, name")
        .limit(10);

    const leaderboard = (profiles || []).map((p: any, i: number) => ({
        userId: p.user_id,
        name: p.name || "Koda Athlete",
        score: 1200 - i * 45,
        rank: i + 1,
    }));

    return NextResponse.json({
        squadId,
        squadName:
            squadId === "hypertrophy"
                ? "Titanium Hypertrophy"
                : squadId === "endurance"
                    ? "Aero Engine"
                    : squadId === "longevity"
                        ? "Vitality Protocol"
                        : "Rogue Hybrid",
        unit: "Perform Score",
        rank: 4,
        leaderboard,
    });
}
