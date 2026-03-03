import { NextResponse } from "next/server";
import { callModel } from "@/lib/ai/model";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";

export async function POST(request: Request) {
    const requestId = makeRequestId();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
    }

    try {
        const { startDate, durationDays = 7 } = await request.json();

        // 1. Fetch user context
        const [profileRes, planRes] = await Promise.all([
            supabase.from("user_profile").select("*").eq("user_id", user.id).single(),
            supabase.from("daily_plans").select("plan_json").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        ]);

        const profile = profileRes.data;
        const targets = planRes.data?.plan_json?.nutrition_plan || { calorie_target: 2000, macros: { protein_g: 150, carbs_g: 200, fat_g: 70 } };

        // 2. Draft AI Prompt
        const systemPrompt = `You are an expert sports nutritionist. Generate a ${durationDays}-day meal plan.
    Return ONLY JSON matching this structure:
    {
      "days": [
        {
          "date": "YYYY-MM-DD",
          "meals": [
            { "name": "string", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "recipe": "string", "ingredients": ["string"] }
          ]
        }
      ],
      "grocery_list": [
        { "item": "string", "category": "Produce|Meat|Dairy|Canned|Dry|Other", "quantity": "string" }
      ]
    }`;

        const userPrompt = `User Profile:
    - Goals: ${profile?.goals?.join(", ") || "General health"}
    - Dietary Prefs: ${JSON.stringify(profile?.dietary_preferences || {})}
    - Daily Targets: ${targets.calorie_target}kcal, ${targets.macros?.protein_g}g P, ${targets.macros?.carbs_g}g C, ${targets.macros?.fat_g}g F.
    
    Generate a ${durationDays}-day plan starting from ${startDate || new Date().toISOString().split("T")[0]}. 
    Ensure recipes are diverse and macro-accurate. Aggregrate all ingredients into a categorized grocery list.`;

        // 3. Call AI
        const { content } = await callModel({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            model: "openai/gpt-4o",
            maxTokens: 3000,
            temperature: 0.7,
        });

        const planData = JSON.parse(content.replace(/```json|```/gi, "").trim());

        // 4. Save to Database
        const { data: mealPlan, error: mealPlanError } = await supabase
            .from("meal_plans")
            .insert({
                user_id: user.id,
                start_date: planData.days[0].date,
                end_date: planData.days[planData.days.length - 1].date,
                plan_json: planData
            })
            .select("plan_id")
            .single();

        if (mealPlanError) throw mealPlanError;

        await supabase.from("grocery_lists").insert({
            user_id: user.id,
            plan_id: mealPlan.plan_id,
            items_json: planData.grocery_list
        });

        return NextResponse.json({ plan: planData, planId: mealPlan.plan_id });

    } catch (error) {
        console.error("recipe_gen_error", { requestId, error });
        return jsonError(500, "INTERNAL_ERROR", "Failed to generate meal plan.");
    }
}
