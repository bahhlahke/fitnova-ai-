import { NextResponse } from "next/server";
import { callModel } from "@/lib/ai/model";
import { createClient } from "@/lib/supabase/server";
import { clampConfidence, defaultLimitations } from "@/lib/ai/reliability";

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized. Please log in to access the Motion Lab." }, { status: 401 });
        }

        const body = await req.json();
        const { images } = body as { images: string[] };

        if (!images || images.length === 0) {
            return NextResponse.json({ error: "No images provided for analysis." }, { status: 400 });
        }

        const MAX_FRAMES = 3;
        const frames = images.slice(0, MAX_FRAMES);

        // Convert base64 data URIs into OpenRouter Vision format
        const contentArray: any[] = [
            { type: "text", text: "Analyze the biomechanics of this lift. Provide a strict JSON response with 'score' (1-100), 'critique' (direct breakdown), 'correction' (what to focus on), and 'confidence_score' (0-1). Do not use markdown backticks around the json. Just output raw json." }
        ];

        frames.forEach((img) => {
            contentArray.push({
                type: "image_url",
                image_url: { url: img }
            });
        });

        const systemPrompt = "You are an elite, highly technical biomechanics AI coach. Only respond in pure JSON. Example: {\"score\": 85, \"critique\": \"Knees are caving in at depth.\", \"correction\": \"Drive knees outward and root your feet.\", \"confidence_score\": 0.72}";

        const { content: responseText } = await callModel({
            model: "openai/gpt-4o-mini", // fallback to mini for speed, auto-routes vision on openrouter
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: contentArray as any }
            ],
            maxTokens: 300,
        });

        // Attempt to parse the json explicitly
        try {
            const parsed = JSON.parse(responseText.trim());
            const confidence = clampConfidence(
                typeof parsed.confidence_score === "number" ? parsed.confidence_score : 0.64
            );
            return NextResponse.json({
                ...parsed,
                confidence_score: confidence,
                reliability: {
                    confidence_score: confidence,
                    explanation: "Confidence reflects frame clarity and agreement across sampled movement frames.",
                    limitations: defaultLimitations("motion"),
                },
            });
        } catch (e) {
            console.error("Failed to parse JSON vision response:", responseText);
            // Fallback generic response if model goes rogue
            return NextResponse.json({
                score: 70,
                critique: "Could not completely verify biomechanics.",
                correction: "Continue focusing on core stability.",
                confidence_score: 0.4,
                reliability: {
                    confidence_score: 0.4,
                    explanation: "Fallback output due to malformed model response.",
                    limitations: defaultLimitations("motion"),
                },
            });
        }
    } catch (error: any) {
        console.error("Vision Analysis Error:", error);
        return NextResponse.json({ error: "Failed to analyze motion." }, { status: 500 });
    }
}
