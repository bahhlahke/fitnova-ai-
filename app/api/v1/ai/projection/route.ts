import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const requestId = makeRequestId();

    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
        }

        // Fetch recent progress and adherence
        const [progressRes, adherenceRes] = await Promise.all([
            supabase.from("progress_tracking").select("weight").eq("user_id", user.id).order("date", { ascending: false }).limit(7),
            supabase.from("check_ins").select("adherence_score").eq("user_id", user.id).order("date_local", { ascending: false }).limit(7),
        ]);

        const weights = (progressRes.data ?? []).map((p: { weight: number | null }) => p.weight).filter((w): w is number => w !== null);
        const adherences = (adherenceRes.data ?? []).map((a: { adherence_score: number | null }) => a.adherence_score).filter((a): a is number => a !== null);

        const avgAdherence = adherences.length > 0 ? adherences.reduce((a, b) => a + b, 0) / adherences.length : 4;
        const currentWeight = weights[0] ?? 75;

        // Projection logic: if adherence is high, project better results
        // Example: 0.5kg loss per week if adherence > 4, 0.2kg if adherence > 3
        let weeklyRate = 0;
        if (avgAdherence >= 4.5) weeklyRate = -0.6;
        else if (avgAdherence >= 4) weeklyRate = -0.4;
        else if (avgAdherence >= 3) weeklyRate = -0.2;
        else weeklyRate = 0.1;

        const projected4Weeks = currentWeight + (weeklyRate * 4);
        const projected12Weeks = currentWeight + (weeklyRate * 12);

        return NextResponse.json({
            current: currentWeight,
            projected_4w: Math.round(projected4Weeks * 10) / 10,
            projected_12w: Math.round(projected12Weeks * 10) / 10,
            rate: weeklyRate,
            confidence: avgAdherence / 5,
        });
    } catch (error) {
        console.error("projection_unhandled", {
            requestId,
            error: error instanceof Error ? error.message : "unknown",
        });
        return jsonError(500, "INTERNAL_ERROR", "Internal server error.");
    }
}
