/**
 * Eating-out log: track restaurant meals and integrate with nutrition_logs.
 *
 * POST /api/v1/nutrition/eating-out
 *   Body: { restaurant_name?, meal_name, date_local, notes? }
 *   AI estimates nutrition, saves to eating_out_logs AND appends to nutrition_logs.
 *   Returns: { log_id, calories, protein_g, carbs_g, fat_g }
 *
 * GET /api/v1/nutrition/eating-out?date=YYYY-MM-DD
 *   Returns eating_out_logs entries for that date.
 *
 * DELETE /api/v1/nutrition/eating-out?logId=xxx
 *   Removes an eating-out entry.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callModel } from "@/lib/ai/model";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { consumeToken } from "@/lib/api/rate-limit";
import { toLocalDateString } from "@/lib/date/local-date";
import { emitDataRefresh } from "@/lib/ui/data-sync";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = makeRequestId();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");

  const limiter = consumeToken(`eating-out:${user.id}`, 20, 20 / 60);
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Too many requests", code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfterSeconds) } }
    );
  }

  try {
    const body = (await request.json()) as {
      restaurant_name?: string;
      meal_name: string;
      date_local?: string;
      notes?: string;
    };

    if (!body.meal_name?.trim()) {
      return jsonError(400, "INTERNAL_ERROR", "meal_name is required.");
    }

    const dateLocal = body.date_local || toLocalDateString();
    const restaurantCtx = body.restaurant_name ? ` at ${body.restaurant_name}` : "";
    const description = `${body.meal_name}${restaurantCtx}${body.notes ? ` (${body.notes})` : ""}`;

    // AI nutrition estimation
    const { content } = await callModel({
      messages: [
        {
          role: "system",
          content: `You are a nutrition expert. Estimate the calories and macros for restaurant meals.
Return ONLY valid JSON: { "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "confidence": "high|medium|low" }
Use typical restaurant portion sizes. If the restaurant is known, use their typical values.`,
        },
        {
          role: "user",
          content: `Estimate nutrition for: ${description}`,
        },
      ],
      model: "openai/gpt-4o-mini",
      maxTokens: 200,
      temperature: 0.2,
    });

    let estimate = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    try {
      const parsed = JSON.parse(content.replace(/```json|```/gi, "").trim()) as typeof estimate;
      estimate = {
        calories: Math.max(0, Math.round(parsed.calories ?? 0)),
        protein_g: Math.max(0, Math.round(parsed.protein_g ?? 0)),
        carbs_g: Math.max(0, Math.round(parsed.carbs_g ?? 0)),
        fat_g: Math.max(0, Math.round(parsed.fat_g ?? 0)),
      };
    } catch {
      // Keep zeroes if parse fails
    }

    // 1. Insert into eating_out_logs
    const { data: logRow, error: logErr } = await supabase
      .from("eating_out_logs")
      .insert({
        user_id: user.id,
        date_local: dateLocal,
        restaurant_name: body.restaurant_name || null,
        meal_name: body.meal_name,
        calories: estimate.calories,
        protein_g: estimate.protein_g,
        carbs_g: estimate.carbs_g,
        fat_g: estimate.fat_g,
        notes: body.notes || null,
      })
      .select("log_id")
      .single();
    if (logErr) throw logErr;

    // 2. Append to nutrition_logs for the day (upsert)
    const { data: nutritionRow } = await supabase
      .from("nutrition_logs")
      .select("log_id, meals, total_calories")
      .eq("user_id", user.id)
      .eq("date", dateLocal)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const newMealEntry = {
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      description: body.meal_name + (body.restaurant_name ? ` (${body.restaurant_name})` : "") + " 🍽️",
      calories: estimate.calories,
      macros: {
        protein: estimate.protein_g,
        carbs: estimate.carbs_g,
        fat: estimate.fat_g,
      },
    };

    if (nutritionRow) {
      const meals = Array.isArray(nutritionRow.meals) ? nutritionRow.meals : [];
      meals.push(newMealEntry);
      const totalCalories = meals.reduce(
        (sum: number, m: { calories?: number }) => sum + (m.calories ?? 0),
        0
      );
      await supabase
        .from("nutrition_logs")
        .update({ meals, total_calories: totalCalories, updated_at: new Date().toISOString() })
        .eq("log_id", nutritionRow.log_id);
    } else {
      await supabase.from("nutrition_logs").insert({
        user_id: user.id,
        date: dateLocal,
        meals: [newMealEntry],
        total_calories: estimate.calories,
      });
    }

    return NextResponse.json({ log_id: logRow.log_id, ...estimate });
  } catch (err) {
    console.error("eating_out_post_error", { requestId, err });
    return jsonError(500, "INTERNAL_ERROR", "Failed to log eating-out meal.");
  }
}

export async function GET(request: Request) {
  const requestId = makeRequestId();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || toLocalDateString();

    const { data, error } = await supabase
      .from("eating_out_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("date_local", date)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ logs: data ?? [] });
  } catch (err) {
    console.error("eating_out_get_error", { requestId, err });
    return jsonError(500, "INTERNAL_ERROR", "Failed to fetch eating-out logs.");
  }
}

export async function DELETE(request: Request) {
  const requestId = makeRequestId();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");

  try {
    const { searchParams } = new URL(request.url);
    const logId = searchParams.get("logId");
    if (!logId) return jsonError(400, "INTERNAL_ERROR", "logId is required.");

    const { error } = await supabase
      .from("eating_out_logs")
      .delete()
      .eq("log_id", logId)
      .eq("user_id", user.id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("eating_out_delete_error", { requestId, err });
    return jsonError(500, "INTERNAL_ERROR", "Failed to delete eating-out log.");
  }
}
