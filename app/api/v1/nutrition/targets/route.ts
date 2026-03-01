import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { consumeToken } from "@/lib/api/rate-limit";
import { jsonError, makeRequestId } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

const RATE_LIMIT_CAPACITY = 20;
const RATE_LIMIT_REFILL_PER_SECOND = 20 / 60;

type TargetRequest = {
  calorie_target?: number | null;
  protein_target_g?: number | null;
  carbs_target_g?: number | null;
  fat_target_g?: number | null;
  meal_timing?: Array<{ label: string; window?: string }>;
};

function toOptionalNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function GET() {
  const requestId = makeRequestId();

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
    }

    const res = await supabase
      .from("nutrition_targets")
      .select("target_id, calorie_target, protein_target_g, carbs_target_g, fat_target_g, meal_timing, active, created_at, updated_at")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle();

    if (res.error) {
      return jsonError(500, "INTERNAL_ERROR", "Failed to load nutrition target.");
    }

    return NextResponse.json({ target: res.data ?? null });
  } catch (error) {
    console.error("nutrition_targets_get_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Internal server error.");
  }
}

export async function POST(request: Request) {
  const requestId = makeRequestId();

  let body: TargetRequest;
  try {
    body = (await request.json()) as TargetRequest;
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid JSON body.");
  }

  const mealTiming = Array.isArray(body.meal_timing)
    ? body.meal_timing.filter((item) => item && typeof item.label === "string" && item.label.trim())
    : [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
    }

    const limiter = consumeToken(
      `nutrition-targets:${user.id}`,
      RATE_LIMIT_CAPACITY,
      RATE_LIMIT_REFILL_PER_SECOND
    );
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(limiter.retryAfterSeconds) } }
      );
    }

    const upsertRes = await supabase.from("nutrition_targets").upsert(
      {
        user_id: user.id,
        calorie_target: toOptionalNumber(body.calorie_target),
        protein_target_g: toOptionalNumber(body.protein_target_g),
        carbs_target_g: toOptionalNumber(body.carbs_target_g),
        fat_target_g: toOptionalNumber(body.fat_target_g),
        meal_timing: mealTiming,
        active: true,
      },
      { onConflict: "user_id" }
    );

    if (upsertRes.error) {
      return jsonError(500, "INTERNAL_ERROR", "Failed to save nutrition target.");
    }

    const res = await supabase
      .from("nutrition_targets")
      .select("target_id, calorie_target, protein_target_g, carbs_target_g, fat_target_g, meal_timing, active, created_at, updated_at")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle();

    if (res.error) {
      return jsonError(500, "INTERNAL_ERROR", "Failed to fetch saved nutrition target.");
    }

    return NextResponse.json({ target: res.data ?? null });
  } catch (error) {
    console.error("nutrition_targets_post_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Internal server error.");
  }
}
