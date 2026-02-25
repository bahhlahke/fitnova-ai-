import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { callModel } from "@/lib/ai/model";

export async function POST(request: Request) {
    const requestId = makeRequestId();

    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
        }

        // Fetch today's plan and check-in
        const today = new Date().toISOString().split('T')[0];
        const [planRes, checkInRes] = await Promise.all([
            supabase.from("daily_plans").select("plan_json").eq("user_id", user.id).eq("date_local", today).maybeSingle(),
            supabase.from("check_ins").select("*").eq("user_id", user.id).eq("date_local", today).maybeSingle(),
        ]);

        const plan = planRes.data?.plan_json;
        const checkIn = checkInRes.data;

        if (!plan) {
            return NextResponse.json({ briefing: "Protocol not yet initialized for today. Enter the Coach Room to generate your targets." });
        }

        const prompt = `
      You are an elite AI Performance Coach. Provide a concise, 2-3 sentence "Daily Briefing" for the user.
      Focus on the RATIONALE behind today's plan based on their readiness.
      
      User Data:
      - Plan Focus: ${plan.training_plan.focus}
      - Calorie Target: ${plan.nutrition_plan.calorie_target}
      - Readiness Energy: ${checkIn?.energy_score ?? 'Not provided'}
      - Sleep: ${checkIn?.sleep_hours ?? 'Not provided'}h
      - Soreness: ${checkIn?.soreness_notes ?? 'None'}
      
      Requirements:
      - Tone: Professional, authoritative, elite, encouraging.
      - Length: Max 250 characters.
      - Focus: Why these targets were chosen (e.g., "Adjusting for low sleep to protect recovery" or "Pushing intensity due to high energy baseline").
    `;

        const briefing = await callModel({
            messages: [{ role: "user", content: prompt }],
            maxTokens: 150,
            temperature: 0.7,
        });

        return NextResponse.json({ briefing: briefing.trim().replace(/^"|"$/g, '') });
    } catch (error) {
        console.error("briefing_unhandled", {
            requestId,
            error: error instanceof Error ? error.message : "unknown",
        });
        return jsonError(500, "INTERNAL_ERROR", "Internal server error.");
    }
}
