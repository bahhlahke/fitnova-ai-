import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { callModel } from "@/lib/ai/model";
import { assembleContext } from "@/lib/ai/assemble-context";

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

        const context = await assembleContext(supabase, user.id);

        const prompt = `
      You are Koda, an Elite AI Performance Coach & Sports Scientist. 
      You are looking at the "Coach's Desk" terminal for a high-performance athlete.
      
      Your goal is to provide 2-3 "Proactive Mastery Insights" based on their biometric trends, training volume, and recovery signals.
      
      Guidelines:
      1. NO generic advice. 
      2. BE hyper-specific and non-obvious (e.g., detect "Latent Overreaching" if HRV is down despite high sleep, or "Metabolic Window" if training frequency is high but protein tracking is inconsistent).
      3. Use athletic terminology (CNS, Hypertrophy, Zone 2, Metabolic stress).
      4. Format as JSON.
      
      Response Structure:
      {
        "insights": [
          {
            "title": "Short Impactful Title",
            "message": "Detailed, data-backed insight and recommended adjustment.",
            "urgency": "low" | "medium" | "high",
            "cta_route": "/log/workout" | "/coach" | "/history" | "/community" | "/check-in" | null,
            "supporting_data": {
              "headline": "Metric Name (e.g. HRV Trend)",
              "value": "Current Value (e.g. 45ms)",
              "context": "Short explanation of the data (e.g. 15% below baseline)",
              "type": "chart" | "stat" | "text"
            }
          }
        ]
      }
      
      Athlete Context:
      ${context.systemPrompt}
    `;

        const { content: rawContent } = await callModel({
            messages: [{ role: "user", content: prompt }],
            maxTokens: 500,
            temperature: 0.7,
        });

        let insightsData: { insights: any[] } = { insights: [] };
        try {
            const jsonStr = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
            insightsData = JSON.parse(jsonStr);
        } catch (e) {
            // Fallback if parsing fails
            insightsData = {
                insights: [
                    {
                        title: "Analysis Initialized",
                        message: "Context synthesis in progress. Standard training protocol remains active.",
                        urgency: "low",
                    },
                ],
            };
        }

        return NextResponse.json(insightsData);
    } catch (error) {
        console.error("coach_desk_unhandled", {
            requestId,
            error: error instanceof Error ? error.message : "unknown",
        });
        return jsonError(500, "INTERNAL_ERROR", "Internal server error.");
    }
}
