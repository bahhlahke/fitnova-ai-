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
        const { images } = body as { images: { front: string, side: string, back: string } };

        if (!images || !images.front || !images.side || !images.back) {
            return NextResponse.json({ error: "Missing required images for analysis (Front, Side, Back)." }, { status: 400 });
        }

        const contentArray: any[] = [
            { type: "text", text: "You are an elite anthropometrist and DEXA scan alternative. Analyze the provided front, side, and back images of the user's physique and estimate their total body fat percentage. Since genetic fat distribution varies, carefully composite the 3-dimensional fat volume." },
            { type: "image_url", image_url: { url: images.front } },
            { type: "image_url", image_url: { url: images.side } },
            { type: "image_url", image_url: { url: images.back } }
        ];

        const systemPrompt = `You are an elite AI body composition scanner acting as a clinical DEXA alternative. You must analyze the images and estimate the body fat percentage based strictly on these visual heuristics for males (adjust +8% if female):

1. < 10%: Deep muscle separation. Striations in shoulders/chest. Veins visible on lower abdomen/pelvis. Serratus anterior (finger-like muscles on ribs) are deeply cut.
2. 10% - 12%: Deeply visible transverse tendinous intersections (six-pack) without flexing. Clear division between obliques and abdominals. Vascularity in arms.
3. 13% - 15%: Top 4 abs visible, but lower abdomen might have a slight layer of fat. Slight vascularity on forearms. Muscle separation is visible but not deeply cut.
4. 16% - 19%: Flat stomach, but transverse intersections (abs) are largely invisible or only faintly shadowed. Muscle outlines exist but lack sharp separation.
5. 20% - 24%: No abdominal definition. Subcutaneous fat pooling around the lower waist (love handles). Chest lacks sharp lower boundary. Roundness in the lower back/glute region.
6. > 25%: Significant fat accumulation. Roundness around the midsection. No visible vascularity. Significant back folds.

Be extremely critical. Do not flatter the user. If they lack sharp definition, place them higher than 15%. Synthesize the front, side, and back profiles to account for genetic fat storage variations.

Output ONLY pure JSON formatted exactly like this example without markdown wrappers:
{"body_fat_percent": 16.5, "analysis": "Flat stomach but transverse intersections are entirely obscured by subcutaneous fat. Lower obliques show slight pooling from the side and back angles."}`;

        const { content: responseText } = await callModel({
            model: "openai/gpt-5.2", // Using an extremely capable vision reasoning model
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: contentArray as any }
            ],
            maxTokens: 500,
        });

        // Parse explicit JSON
        try {
            const parsed = JSON.parse(responseText.trim());

            // Log it directly into progress tracking
            const today = new Date().toISOString().split("T")[0];
            const { data: existingTarget } = await supabase
                .from("progress_tracking")
                .select("track_id")
                .eq("user_id", user.id)
                .eq("date", today)
                .maybeSingle();

            if (existingTarget) {
                await supabase
                    .from("progress_tracking")
                    .update({ body_fat_percent: parsed.body_fat_percent, notes: "Logged via AI Body Comp Scanner" })
                    .eq("track_id", existingTarget.track_id);
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
