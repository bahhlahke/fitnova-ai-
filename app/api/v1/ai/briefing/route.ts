import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { callModel } from "@/lib/ai/model";

export const dynamic = "force-dynamic";

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

        const body = await request.json().catch(() => ({}));
        const localDate = body.localDate || new Date().toISOString().split('T')[0];

        // Fetch today's plan and check-in
        const today = localDate;
        const [planRes, checkInRes, workoutRes] = await Promise.all([
            supabase.from("daily_plans").select("plan_json").eq("user_id", user.id).eq("date_local", today).maybeSingle(),
            supabase.from("check_ins").select("*").eq("user_id", user.id).eq("date_local", today).maybeSingle(),
            supabase.from("workout_logs").select("*").eq("user_id", user.id).eq("date", today).limit(1).maybeSingle(),
        ]);

        const plan = planRes.data?.plan_json;
        const checkIn = checkInRes.data;
        const workout = workoutRes.data;

        if (!plan && !workout) {
            return NextResponse.json({ briefing: "Protocol not yet initialized for today. Enter the Coach Room to generate your targets." });
        }

        let prompt;
        if (!plan && workout) {
            prompt = `
      You are an elite AI Performance Coach. Provide a concise "Daily Briefing" for the user.
      The user executed a workout today but did not generate a prescribed protocol.
      
      User Data:
      - Workout Type: ${workout.workout_type || 'Unknown'}
      - Workout Duration: ${workout.duration_minutes || 'Unknown'} min
      - Readiness Energy: ${checkIn?.energy_score ?? 'Not provided'}
      - Sleep: ${checkIn?.sleep_hours ?? 'Not provided'}h
      
      Requirements:
      - Return ONLY raw JSON without markdown formatting.
      - Structure:
        {
          "briefing": "Short 1-2 sentence encouraging message",
          "rationale": "Why you are saying this",
          "inputs": ["Array of", "Specific data", "Points used (e.g. 'Sleep: 4h')"]
        }
    `;
        } else {
            prompt = `
      You are Koda, an Elite AI Performance Coach & Sports Scientist. 
      Provide a precise, data-driven JSON "Daily Briefing" for a high-performance athlete.
      Focus on the physiological RATIONALE behind today's protocol based on their specific recovery signals.
      
      User Data:
      - Plan Focus: ${plan?.training_plan?.focus ?? 'General'}
      - Calorie Target: ${plan?.nutrition_plan?.calorie_target ?? 'Maintenance'}
      - Readiness Energy: ${checkIn?.energy_score ?? 'Not provided'}/5
      - Sleep: ${checkIn?.sleep_hours ?? 'Not provided'}h
      - Soreness/Context: ${checkIn?.soreness_notes ?? 'None'}
      
      Requirements:
      - Tone: Authoritative, elite, zero-fluff, scientific yet motivating.
      - Return ONLY raw JSON without markdown formatting.
      - Structure:
        {
          "briefing": "Short 1-2 sentence elite directive (e.g. 'Push CNS limits today. Recovery window is optimal.')",
          "rationale": "High-fidelity physiological reasoning for today's protocol (e.g. 'Elevated HRV and deep sleep cycles indicate peak neural recovery, allowing for 95%+ intensity targets.')",
          "inputs": ["Array of", "Specific data", "Points used (e.g. 'HRV: +15%', 'Sleep: 8.5h')"]
        }
    `;
        }

        const { content: rawContent } = await callModel({
            messages: [{ role: "user", content: prompt }],
            maxTokens: 300,
            temperature: 0.7,
        });

        // Attempt to parse JSON
        let briefingData = {
            briefing: rawContent.trim().replace(/^"|"$/g, ''),
            rationale: "Standard protocol initialized.",
            inputs: ["Baseline"]
        };

        try {
            const jsonStr = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
            briefingData = JSON.parse(jsonStr);
        } catch (e) {
            // fallback to raw text if parse fails
            briefingData.briefing = rawContent.substring(0, 150) + "...";
        }

        return NextResponse.json(briefingData);
    } catch (error) {
        console.error("briefing_unhandled", {
            requestId,
            error: error instanceof Error ? error.message : "unknown",
        });
        return jsonError(500, "INTERNAL_ERROR", "Internal server error.");
    }
}
