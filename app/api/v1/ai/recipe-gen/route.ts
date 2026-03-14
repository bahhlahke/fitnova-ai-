import { NextResponse } from "next/server";
import { callModel } from "@/lib/ai/model";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import type { MealPlanPreferences, EnhancedMealPlan, EnhancedGroceryItem } from "@/types";

export const dynamic = "force-dynamic";

const DEFAULT_PREFS: MealPlanPreferences = {
  duration_days: 7,
  meals_per_day: 3,
  dietary_restrictions: [],
  allergies: [],
  cuisine_preferences: [],
  cooking_skill: "intermediate",
  prep_time_budget: "moderate",
  weekly_budget_usd: null,
  servings_per_meal: 1,
  meal_prep_mode: false,
  include_snacks: false,
};

const PREP_TIME_LABELS: Record<MealPlanPreferences["prep_time_budget"], string> = {
  quick: "under 15 minutes per meal",
  moderate: "15–30 minutes per meal",
  elaborate: "up to 60 minutes per meal",
};

export async function POST(request: Request) {
  const requestId = makeRequestId();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
  }

  try {
    const body = await request.json();
    const startDate: string = body.startDate || new Date().toISOString().split("T")[0];

    // Merge incoming preferences with defaults
    const prefs: MealPlanPreferences = { ...DEFAULT_PREFS, ...(body.preferences ?? {}) };
    const durationDays = prefs.duration_days;

    // 1. Fetch user context
    const [profileRes, planRes] = await Promise.all([
      supabase.from("user_profile").select("*").eq("user_id", user.id).single(),
      supabase
        .from("daily_plans")
        .select("plan_json")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const profile = profileRes.data;
    const targets = (planRes.data?.plan_json as Record<string, unknown> | null)?.nutrition_plan as {
      calorie_target?: number;
      macros?: { protein_g?: number; carbs_g?: number; fat_g?: number };
    } | undefined ?? {
      calorie_target: 2000,
      macros: { protein_g: 150, carbs_g: 200, fat_g: 70 },
    };

    // Merge profile-level meal planning prefs (set in settings) as lower-priority defaults
    const profileMealPrefs = (profile?.dietary_preferences as Record<string, unknown> | null)
      ?.meal_planning as Partial<MealPlanPreferences> | undefined;
    if (profileMealPrefs) {
      Object.entries(profileMealPrefs).forEach(([k, v]) => {
        const key = k as keyof MealPlanPreferences;
        // Only use profile pref if not overridden by explicit request body
        if (body.preferences?.[key] === undefined) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (prefs as any)[key] = v;
        }
      });
    }

    // Build cuisine / restriction / allergy strings
    const cuisineStr = prefs.cuisine_preferences.length
      ? prefs.cuisine_preferences.join(", ")
      : "varied (no specific preference)";
    const restrictionStr = prefs.dietary_restrictions.length
      ? prefs.dietary_restrictions.join(", ")
      : "none";
    const allergyStr = prefs.allergies.length ? prefs.allergies.join(", ") : "none";
    const budgetStr = prefs.weekly_budget_usd
      ? `$${prefs.weekly_budget_usd} USD for the week`
      : "no budget constraint";
    const servingsLabel =
      prefs.servings_per_meal === 4 ? "4 (meal prep batch)" : String(prefs.servings_per_meal);
    const mealsNote = prefs.include_snacks
      ? `${prefs.meals_per_day} meals including snacks`
      : `${prefs.meals_per_day} main meals`;

    // 2. Build AI prompt
    const systemPrompt = `You are an expert sports nutritionist and chef. Generate a ${durationDays}-day personalized meal plan.

CRITICAL RULES:
1. ALL ingredient quantities MUST use US imperial units: oz, lbs, cups, tablespoons (tbsp), teaspoons (tsp), fluid ounces (fl oz). NEVER use grams or milliliters for ingredient quantities.
2. Dietary restrictions MUST be strictly followed — no exceptions.
3. Allergies listed must NEVER appear in any form.
4. Vary proteins and cuisines across days — avoid repeating the same protein two days in a row.
5. Calorie totals across all meals in a day should sum within ±50 kcal of the daily target.
6. Return ONLY valid JSON. No markdown, no code blocks, no extra text.

Return JSON matching this exact structure:
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "meals": [
        {
          "name": "string",
          "meal_type": "breakfast|lunch|dinner|snack",
          "calories": 0,
          "protein": 0,
          "carbs": 0,
          "fat": 0,
          "fiber_g": 0,
          "sodium_mg": 0,
          "recipe": "Brief cooking instructions (2-4 sentences)",
          "ingredients": ["8 oz chicken breast", "1 cup brown rice", "2 tbsp olive oil"],
          "prep_time_minutes": 0,
          "servings": 1,
          "cuisine_type": "string",
          "estimated_cost_usd": 0.00
        }
      ]
    }
  ],
  "grocery_list": [
    {
      "item": "string",
      "category": "Produce|Meat & Seafood|Dairy & Eggs|Canned & Jarred|Dry & Pantry|Frozen|Bakery|Beverages|Other",
      "quantity": "2 lbs",
      "estimated_cost_usd": 0.00,
      "checked": false
    }
  ],
  "total_estimated_cost_usd": 0.00
}`;

    const userPrompt = `User Profile:
- Goals: ${profile?.goals?.join(", ") || "General health"}
- Dietary targets: ${targets.calorie_target} kcal/day | Protein: ${targets.macros?.protein_g}g | Carbs: ${targets.macros?.carbs_g}g | Fat: ${targets.macros?.fat_g}g

Meal Plan Preferences:
- Duration: ${durationDays} days starting ${startDate}
- Meals per day: ${mealsNote}
- Dietary restrictions: ${restrictionStr}
- Allergies (NEVER include): ${allergyStr}
- Cuisine preferences: ${cuisineStr}
- Cooking skill level: ${prefs.cooking_skill}
- Max prep time: ${PREP_TIME_LABELS[prefs.prep_time_budget]}
- Servings per recipe: ${servingsLabel}
- Cooking style: ${prefs.meal_prep_mode ? "Batch cook on weekends — recipes should scale for meal prep" : "Cook fresh daily"}
- Weekly food budget: ${budgetStr}

Generate the complete ${durationDays}-day plan. Aggregate all ingredients into a single consolidated grocery list with accurate imperial quantities (combine duplicates).`;

    // 3. Call AI — use higher token limits for longer plans
    const maxTokens = durationDays <= 3 ? 2500 : durationDays <= 7 ? 4500 : 8000;
    const { content } = await callModel({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "openai/gpt-4o",
      maxTokens,
      temperature: 0.7,
    });

    const planData = JSON.parse(content.replace(/```json|```/gi, "").trim()) as EnhancedMealPlan;

    // Ensure all grocery items have checked=false if not set
    planData.grocery_list = (planData.grocery_list ?? []).map((item) => ({
      ...item,
      checked: false,
    })) as EnhancedGroceryItem[];

    // 4. Save to database
    const { data: mealPlan, error: mealPlanError } = await supabase
      .from("meal_plans")
      .insert({
        user_id: user.id,
        start_date: planData.days[0]?.date,
        end_date: planData.days[planData.days.length - 1]?.date,
        duration_days: durationDays,
        preferences_json: prefs,
        plan_json: planData,
      })
      .select("plan_id")
      .single();

    if (mealPlanError) throw mealPlanError;

    await supabase.from("grocery_lists").insert({
      user_id: user.id,
      plan_id: mealPlan.plan_id,
      items_json: planData.grocery_list,
    });

    return NextResponse.json({ plan: planData, planId: mealPlan.plan_id });
  } catch (error) {
    console.error("recipe_gen_error", { requestId, error });
    return jsonError(500, "INTERNAL_ERROR", "Failed to generate meal plan.");
  }
}
