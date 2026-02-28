import { NextResponse } from "next/server";
import { callModel } from "@/lib/ai/model";
import { createClient } from "@/lib/supabase/server";

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
            { type: "text", text: "Analyze the biomechanics of this lift. Provide a strict JSON response with 'score' (1-100), 'critique' (direct breakdown), and 'correction' (what to focus on). Do not use markdown backticks around the json. Just output raw json." }
        ];

        frames.forEach((img) => {
            contentArray.push({
                type: "image_url",
                image_url: { url: img }
            });
        });

        const systemPrompt = "You are an elite, highly technical biomechanics AI coach. Only respond in pure JSON. Example: {\"score\": 85, \"critique\": \"Knees are caving in at depth.\", \"correction\": \"Drive knees outward and root your feet.\"}";

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
            return NextResponse.json(parsed);
        } catch (e) {
            console.error("Failed to parse JSON vision response:", responseText);
            // Fallback generic response if model goes rogue
            return NextResponse.json({
                score: 70,
                critique: "Could not completely verify biomechanics.",
                correction: "Continue focusing on core stability."
            });
        }
    } catch (error: any) {
        console.error("Vision Analysis Error:", error);
        return NextResponse.json({ error: "Failed to analyze motion." }, { status: 500 });
    }
}
