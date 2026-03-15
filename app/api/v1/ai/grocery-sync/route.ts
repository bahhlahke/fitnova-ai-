import { NextResponse } from "next/server";
import { callModel } from "@/lib/ai/model";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import type { EnhancedMeal, EnhancedGroceryItem } from "@/types";

export const dynamic = "force-dynamic";

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
    const { planId, days } = await request.json();

    if (!days || !Array.isArray(days)) {
      return jsonError(400, "INTERNAL_ERROR", "Days array is required.");
    }

    // Extract all ingredients with their meal names for context
    const mealsWithIngredients = days.flatMap((day: any) => 
      (day.meals || []).map((meal: EnhancedMeal) => ({
        name: meal.name,
        ingredients: meal.ingredients
      }))
    );

    const systemPrompt = `You are an expert chef and logistics manager. Your task is to take a list of meals and their ingredients, and create a single, consolidated, and categorized grocery list.

CRITICAL RULES:
1. ALL ingredient quantities MUST use US imperial units: oz, lbs, cups, tablespoons (tbsp), teaspoons (tsp), fluid ounces (fl oz). Combine identical items into a single entry with a summed quantity.
2. CATEGORIZATION: Use these categories and no others: Produce, Meat & Seafood, Dairy & Eggs, Canned & Jarred, Dry & Pantry, Frozen, Bakery, Beverages, Other.
3. TRACEABILITY: For each grocery item, include the "source_recipe_name" (the name of the meal it came from). If an item is used in multiple meals, list the main one or the first one.
4. Return ONLY valid JSON. No markdown, no code blocks.

Return JSON matching this exact structure:
{
  "grocery_list": [
    {
      "item": "string",
      "category": "Produce|Meat & Seafood|Dairy & Eggs|Canned & Jarred|Dry & Pantry|Frozen|Bakery|Beverages|Other",
      "quantity": "string",
      "estimated_cost_usd": 0.00,
      "checked": false,
      "source_recipe_name": "string"
    }
  ]
}`;

    const userPrompt = `Generate a consolidated grocery list for these meals:
${JSON.stringify(mealsWithIngredients, null, 2)}`;

    const { content } = await callModel({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "openai/gpt-4o",
      maxTokens: 3000,
      temperature: 0.3, // Lower temperature for more consistent, data-driven results
    });

    const data = JSON.parse(content.replace(/```json|```/gi, "").trim());
    const groceryList = data.grocery_list || [];

    // Optional: If planId is provided, persist the updated grocery list
    if (planId) {
      const { data: listRow } = await supabase
        .from("grocery_lists")
        .select("list_id")
        .eq("user_id", user.id)
        .eq("plan_id", planId)
        .maybeSingle();

      if (listRow) {
        await supabase
          .from("grocery_lists")
          .update({ 
            items_json: groceryList,
            updated_at: new Date().toISOString()
          })
          .eq("list_id", listRow.list_id);
      }
    }

    return NextResponse.json({ grocery_list: groceryList });
  } catch (error) {
    console.error("grocery_sync_error", { requestId, error });
    return jsonError(500, "INTERNAL_ERROR", "Failed to sync grocery list.");
  }
}
