import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { consumeToken } from "@/lib/api/rate-limit";
import { toLocalDateString } from "@/lib/date/local-date";
import { composeWeeklyPlan } from "@/lib/plan/compose-weekly-plan";

export const dynamic = "force-dynamic";

const RATE_LIMIT_CAPACITY = 8;
const RATE_LIMIT_REFILL_PER_SECOND = 8 / 60;

function getWeekStartLocal(date = new Date()): string {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(diff);
  return toLocalDateString(monday);
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET(request: Request) {
  const requestId = makeRequestId();

  try {
    const { supabase, user } = await requireUser();
    if (!user) {
      return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
    }

    const limiter = consumeToken(
      `weekly-plan:${user.id}`,
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

    const weekStartLocal = getWeekStartLocal();
    const url = new URL(request.url);
    const refresh = url.searchParams.get("refresh") === "1";

    if (!refresh) {
      const existingRes = await supabase
        .from("weekly_plans")
        .select("plan_json")
        .eq("user_id", user.id)
        .eq("week_start_local", weekStartLocal)
        .maybeSingle();

      if (existingRes.data?.plan_json) {
        return NextResponse.json({ plan: existingRes.data.plan_json });
      }
    }

    const plan = await composeWeeklyPlan({ supabase, userId: user.id });

    const upsertRes = await supabase.from("weekly_plans").upsert(
      {
        user_id: user.id,
        week_start_local: weekStartLocal,
        plan_json: plan,
      },
      { onConflict: "user_id,week_start_local" }
    );

    if (upsertRes.error) {
      console.error("weekly_plan_upsert_failed", {
        requestId,
        message: upsertRes.error.message,
      });
      return jsonError(500, "INTERNAL_ERROR", "Failed to save weekly plan.");
    }

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("weekly_plan_get_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Internal server error.");
  }
}

export async function POST() {
  const requestId = makeRequestId();

  try {
    const { supabase, user } = await requireUser();
    if (!user) {
      return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
    }

    const limiter = consumeToken(
      `weekly-plan:${user.id}`,
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

    const weekStartLocal = getWeekStartLocal();
    const plan = await composeWeeklyPlan({ supabase, userId: user.id });

    const upsertRes = await supabase.from("weekly_plans").upsert(
      {
        user_id: user.id,
        week_start_local: weekStartLocal,
        plan_json: plan,
      },
      { onConflict: "user_id,week_start_local" }
    );

    if (upsertRes.error) {
      console.error("weekly_plan_upsert_failed", {
        requestId,
        message: upsertRes.error.message,
      });
      return jsonError(500, "INTERNAL_ERROR", "Failed to save weekly plan.");
    }

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("weekly_plan_post_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Internal server error.");
  }
}
