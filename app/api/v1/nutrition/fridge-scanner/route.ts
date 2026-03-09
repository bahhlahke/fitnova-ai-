import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { media, type, localDate } = body;

        if (!media) {
            return NextResponse.json({ error: "No media provided" }, { status: 400 });
        }

        // In a real implementation we would route this to GPT-4V or Gemini 1.5 Pro Vision
        // to extract the ingredients from the image/video, then construct the recipes.
        // For now, we simulate the Vision output.

        // Let's check the user's plan to see what their macros are so we can "match" them
        const { data: planData } = await supabase.from("daily_plans").select("plan_json").eq("user_id", user.id).eq("date_local", localDate || new Date().toISOString().split('T')[0]).maybeSingle();

        // Simulate ~3-4 seconds of "Vision Processing"
        await new Promise(r => setTimeout(r, 3500));

        // Simulated Vision Response
        const recipes = [
            {
                name: "Egg & Spinach Power Scramble",
                calories: 380,
                protein: 34,
                carbs: 8,
                fat: 22,
                ingredients: ["3 Large Eggs", "Handful of Spinach", "1/4 cup Feta Cheese", "Olive Oil drizzle"],
                instructions: "Scramble eggs, toss in spinach until wilted, top with feta."
            },
            {
                name: "Greek Yogurt Berry Bowl",
                calories: 250,
                protein: 22,
                carbs: 35,
                fat: 4,
                ingredients: ["1 cup Greek Yogurt", "Mixed Berries (frozen)", "Drizzle of Honey"],
                instructions: "Layer yogurt and berries, top with honey."
            },
            {
                name: "Chicken & Bell Pepper Skillet",
                calories: 520,
                protein: 55,
                carbs: 15,
                fat: 25,
                ingredients: ["Chicken Breast", "Red Bell Pepper", "Onion", "Avocado slices"],
                instructions: "Dice chicken and veggies. Sauté until cooked. Top with avocado."
            }
        ];

        return NextResponse.json({
            success: true,
            recipes
        });
    } catch (error: any) {
        console.error("Fridge Scanner error:", error);
        return NextResponse.json({ error: "Failed to process media" }, { status: 500 });
    }
}
