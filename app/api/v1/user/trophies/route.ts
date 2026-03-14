import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

export async function GET() {
    const requestId = makeRequestId();

    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
        }

        const { data: trophies, error } = await supabase
            .from("trophies")
            .select("*")
            .eq("user_id", user.id)
            .order("earned_at", { ascending: false });

        if (error) {
            console.error("fetch_trophies_error", { requestId, error });
            return NextResponse.json({
                trophies: [],
                degraded: true,
                message: "Achievements are warming up. Your progress data is still safe.",
            });
        }

        return NextResponse.json({ trophies: trophies || [] });
    } catch (error) {
        console.error("trophies_unhandled", {
            requestId,
            error: error instanceof Error ? error.message : "unknown",
        });
        return NextResponse.json({
            trophies: [],
            degraded: true,
            message: "Achievements are temporarily unavailable. Your progress data is still safe.",
        });
    }
}
