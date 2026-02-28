import { NextResponse } from "next/server";
import { callModel } from "@/lib/ai/model";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized. Please log in to access the Body Comp Scanner." }, { status: 401 });
        }

        const body = await req.json();
        const { image } = body as { image: string };

        if (!image) {
            return NextResponse.json({ error: "No image provided for analysis." }, { status: 400 });
        }

        const contentArray: any[] = [
            { type: "text", text: "You are an elite anthropometrist. Analyze this image and estimate the body fat percentage. Provide a strict JSON response with a number `body_fat_percent` and a string `analysis` explaining your reasoning based on visible definition. Do not wrap the JSON in markdown backticks." },
            { type: "image_url", image_url: { url: image } }
        ];

        const systemPrompt = "You are an elite AI body composition scanner. Output ONLY pure JSON. Example: {\"body_fat_percent\": 15, \"analysis\": \"Visible abdominal definition but slight subcutaneous fat on the lower torso...\"}";

        const { content: responseText } = await callModel({
            model: "openai/gpt-4o-mini", // Use mini with vision capabilities
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: contentArray as any }
            ],
            maxTokens: 300,
        });

        // Parse explicit JSON
        try {
            const parsed = JSON.parse(responseText.trim());

            // Log it directly into progress tracking
            const today = new Date().toISOString().split("T")[0];
            const { data: existingTarget } = await supabase
                .from("progress_tracking")
                .select("id")
                .eq("user_id", user.id)
                .eq("date", today)
                .maybeSingle();

            if (existingTarget) {
                await supabase
                    .from("progress_tracking")
                    .update({ body_fat_percent: parsed.body_fat_percent, notes: "Logged via AI Body Comp Scanner" })
                    .eq("id", existingTarget.id);
            } else {
                await supabase
                    .from("progress_tracking")
                    .insert({
                        user_id: user.id,
                        date: today,
                        body_fat_percent: parsed.body_fat_percent,
                        measurements: {},
                        notes: "Logged via AI Body Comp Scanner"
                    });
            }

            return NextResponse.json(parsed);
        } catch (e) {
            console.error("Failed to parse Body Comp JSON response:", responseText);
            return NextResponse.json({
                error: "Failed to parse AI response into JSON."
            }, { status: 500 });
        }
    } catch (error: any) {
        console.error("Body Comp Analysis Error:", error);
        return NextResponse.json({ error: "Failed to analyze body composition." }, { status: 500 });
    }
}
