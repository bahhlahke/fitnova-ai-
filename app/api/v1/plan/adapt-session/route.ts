import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { consumeToken } from "@/lib/api/rate-limit";
import { adaptSession } from "@/lib/plan/adapt-session";
import type { AdaptSessionRequest } from "@/lib/plan/types";

export const dynamic = "force-dynamic";

const RATE_LIMIT_CAPACITY = 25;
const RATE_LIMIT_REFILL_PER_SECOND = 25 / 60;

export async function POST(request: Request) {
  const requestId = makeRequestId();

  let body: AdaptSessionRequest;
  try {
    body = (await request.json()) as AdaptSessionRequest;
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid JSON body.");
  }

  if (!Array.isArray(body.current_exercises) || body.current_exercises.length === 0) {
    return jsonError(400, "VALIDATION_ERROR", "current_exercises is required.");
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
      `adapt-session:${user.id}`,
      RATE_LIMIT_CAPACITY,
      RATE_LIMIT_REFILL_PER_SECOND
    );
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(limiter.retryAfterSeconds) } }
      );
    }

    const adapted = adaptSession(body);
    return NextResponse.json(adapted);
  } catch (error) {
    console.error("adapt_session_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Failed to adapt session.");
  }
}
