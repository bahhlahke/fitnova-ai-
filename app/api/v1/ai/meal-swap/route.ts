/**
 * POST /api/v1/ai/meal-swap
 * Generates 3 alternative meals for a specific plan day/slot.
 * Body: { planId, dayDate, mealIndex, currentMeal, targets? }
 * Returns: { options: MealSwapOption[] }
 *
 * PATCH /api/v1/ai/meal-swap
 * Confirms a swap by updating plan_json in the DB.
 * Body: { planId, dayDate, mealIndex, newMeal }
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callModel } from "@/lib/ai/model";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { consumeToken } from "@/lib/api/rate-limit";
import type { EnhancedMeal, EnhancedMealPlan, MealSwapOption } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = makeRequestId();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");

  const limiter = consumeToken(`meal-swap:${user.id}`, 10, 10 / 60);
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Too many requests", code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfterSeconds) } }
    );
  }

  try {
    const { planId, dayDate, mealIndex, currentMeal, targets } = (await request.json()) as {
      planId: string;
      dayDate: string;
      mealIndex: number;
      currentMeal: EnhancedMeal;
      targets?: { calories: number; protein: number; carbs: number; fat: number };
    };

    if (!planId || !dayDate || typeof mealIndex !== "number" || !currentMeal) {
      return jsonError(400, "INTERNAL_ERROR", "planId, dayDate, mealIndex and currentMeal are required.");
    }

    // Fetch user dietary prefs for context
    const profileRes = await supabase
      .from("user_profile")
      .select("dietary_preferences, goals")
      .eq("user_id", user.id)
      .maybeSingle();
    const dietaryPrefs = (profileRes.data?.dietary_preferences as Record<string, unknown>) ?? {};
    const restrictions = (dietaryPrefs.meal_planning as Record<string, unknown>)?.dietary_restrictions as string[] ?? [];
    const allergies = (dietaryPrefs.meal_planning as Record<string, unknown>)?.allergies as string[] ?? [];

    const systemPrompt = `You are an expert nutritionist. Generate exactly 3 alternative meal options to swap for the user's current planned meal.

RULES:
1. Each alternative must match within ±10% of the current meal's calories and protein.
2. All ingredient quantities MUST use US imperial units (oz, lbs, cups, tbsp, tsp, fl oz).
3. Dietary restrictions must be strictly followed.
4. Offer variety — different proteins, cuisines, or prep styles than the current meal.
5. RECIPE LINKS: Provide high-quality, RELEVANT, and UNIQUE recipe URLs. Prefer: Serious Eats, NYT Cooking, Bon Appétit, AllRecipes, Food Network, or Epicurious.
   - NEVER use "example.com" or generic site root URLs.
   - Ensure the URL leads to a specific recipe matching the meal name.
   - Include the source name in "recipe_source".
6. APPETIZING IMAGES: Provide a high-quality food image URL for EVERY meal in the "image_url" field using Unsplash (e.g. "https://source.unsplash.com/featured/800x600?food,keywords").
7. GOAL ALIGNMENT: In "goal_alignment_rationale", explain how this meal fits the user's fitness goals.
8. Return ONLY valid JSON. No markdown, no extra text.

Return JSON:
{
  "options": [
    {
      "name": "string",
      "meal_type": "${currentMeal.meal_type}",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fat": 0,
      "recipe": "Brief instructions (2-3 sentences)",
      "ingredients": ["8 oz salmon fillet", "1 cup quinoa"],
      "prep_time_minutes": 0,
      "reason": "Why this is a good swap (one sentence)",
      "recipe_url": "https://...",
      "recipe_source": "string",
      "image_url": "https://...",
      "goal_alignment_rationale": "string"
    }
  ]
}`;

    const userPrompt = `Current meal to swap:
- Name: ${currentMeal.name}
- Meal type: ${currentMeal.meal_type}
- Calories: ${currentMeal.calories} kcal
- Protein: ${currentMeal.protein}g | Carbs: ${currentMeal.carbs}g | Fat: ${currentMeal.fat}g
- Prep time: ${currentMeal.prep_time_minutes} minutes
- Cuisine: ${currentMeal.cuisine_type ?? "unspecified"}

User constraints:
- Dietary restrictions: ${restrictions.length ? restrictions.join(", ") : "none"}
- Allergies (never include): ${allergies.length ? allergies.join(", ") : "none"}
${targets ? `- Day's remaining macro targets: ${targets.calories} kcal, ${targets.protein}g protein` : ""}

Provide 3 diverse alternatives that closely match the calorie and protein targets.`;

    const { content } = await callModel({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "openai/gpt-4o-mini",
      maxTokens: 1000,
      temperature: 0.8,
    });

    // Handle potential markdown artifacts or conversational filler
    let jsonContent = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonContent) as {
      options?: MealSwapOption[];
    };
    const options = (parsed.options ?? []).slice(0, 3);

    return NextResponse.json({ options });
  } catch (err) {
    console.error("meal_swap_post_error", { requestId, err });
    return jsonError(500, "INTERNAL_ERROR", "Failed to generate swap options.");
  }
}

export async function PATCH(request: Request) {
  const requestId = makeRequestId();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");

  try {
    const { planId, dayDate, mealIndex, newMeal } = (await request.json()) as {
      planId: string;
      dayDate: string;
      mealIndex: number;
      newMeal: EnhancedMeal;
    };

    if (!planId || !dayDate || typeof mealIndex !== "number" || !newMeal) {
      return jsonError(400, "INTERNAL_ERROR", "planId, dayDate, mealIndex and newMeal are required.");
    }

    // Fetch current plan
    const { data: planRow, error: planErr } = await supabase
      .from("meal_plans")
      .select("plan_json")
      .eq("plan_id", planId)
      .eq("user_id", user.id)
      .single();
    if (planErr || !planRow) return jsonError(404, "INTERNAL_ERROR", "Meal plan not found.");

    const plan = planRow.plan_json as EnhancedMealPlan;
    const dayIdx = plan.days.findIndex((d) => d.date === dayDate);
    if (dayIdx === -1) return jsonError(404, "INTERNAL_ERROR", "Day not found in plan.");
    if (mealIndex < 0 || mealIndex >= plan.days[dayIdx].meals.length) {
      return jsonError(400, "INTERNAL_ERROR", "mealIndex out of range.");
    }

    plan.days[dayIdx].meals[mealIndex] = newMeal;

    const { error: updateErr } = await supabase
      .from("meal_plans")
      .update({ plan_json: plan, updated_at: new Date().toISOString() })
      .eq("plan_id", planId)
      .eq("user_id", user.id);
    if (updateErr) throw updateErr;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("meal_swap_patch_error", { requestId, err });
    return jsonError(500, "INTERNAL_ERROR", "Failed to confirm meal swap.");
  }
}
