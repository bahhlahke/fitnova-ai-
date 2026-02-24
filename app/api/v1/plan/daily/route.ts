import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { consumeToken } from "@/lib/api/rate-limit";
import { composeDailyPlan } from "@/lib/plan/compose-daily-plan";
import type { PlannerInputs } from "@/lib/plan/types";

const RATE_LIMIT_CAPACITY = 10;
const RATE_LIMIT_REFILL_PER_SECOND = 10 / 60;

export async function POST(request: Request) {
  const requestId = makeRequestId();

  let body: PlannerInputs | undefined;
  try {
    body = (await request.json()) as PlannerInputs;
  } catch {
    body = {};
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
    }

    const limiter = consumeToken(
      `plan:${user.id}`,
      RATE_LIMIT_CAPACITY,
      RATE_LIMIT_REFILL_PER_SECOND
    );
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMITED" },
        {
          status: 429,
          headers: { "Retry-After": String(limiter.retryAfterSeconds) },
        }
      );
    }

    const plan = await composeDailyPlan(
      { supabase, userId: user.id },
      body ?? {}
    );

    const { error: insertErr } = await supabase.from("daily_plans").insert({
      user_id: user.id,
      date_local: plan.date_local,
      plan_json: plan,
    });

    if (insertErr) {
      console.error("daily_plan_insert_failed", {
        requestId,
        userId: user.id,
        message: insertErr.message,
      });
      return jsonError(500, "INTERNAL_ERROR", "Failed to save daily plan.");
    }

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("daily_plan_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Internal server error.");
  }
}
