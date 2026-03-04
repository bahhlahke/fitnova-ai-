import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";

export async function POST(request: Request) {
    const requestId = makeRequestId();
    try {
        const { question, exercise, context } = await request.json();
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
        }

        // In a real implementation, this would call an LLM with exercise science context.
        // For now, we'll provide high-quality simulated expert responses.

        let reply = "";
        const q = question.toLowerCase();

        if (q.includes("form") || q.includes("how to")) {
            reply = `As your AI trainer, focus on the ${exercise || "movement"}'s core mechanics. Keep your spine neutral and initiate with your ${q.includes("squat") ? "hips" : "shoulder blades"}. Control the eccentric phase for maximum hypertrophy.`;
        } else if (q.includes("pain") || q.includes("hurt")) {
            reply = "Stop immediately if you feel sharp or radiating pain. Let's try a regression or swap this move. Would you like me to suggest an alternative that's easier on your joints?";
        } else if (q.includes("heavy") || q.includes("weight")) {
            reply = "If you can hit your rep target with 2+ reps clean in the tank (RPE 7-8), you can consider a small 2.5-5lb increase next set. Form always dictates the load.";
        } else {
            reply = `That's a great question about ${exercise || "your training"}. Generally, in this phase, we prioritize movement quality and consistent tension. Keep pushing, you're doing great!`;
        }

        return NextResponse.json({ reply, requestId });
    } catch (error) {
        console.error("workout_feedback_error", { requestId, error });
        return jsonError(500, "INTERNAL_ERROR", "Failed to get coaching feedback.");
    }
}
