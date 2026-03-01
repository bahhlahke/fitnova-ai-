import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { consumeToken } from "@/lib/api/rate-limit";
import { getNextTargets, recomputeProgressionSnapshots } from "@/lib/progression/targets";

export const dynamic = "force-dynamic";

const RATE_LIMIT_CAPACITY = 20;
const RATE_LIMIT_REFILL_PER_SECOND = 20 / 60;

function parseExercises(url: string): string[] {
  const raw = new URL(url).searchParams.get("exercises") ?? "";
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 25);
}

export async function GET(request: Request) {
  const requestId = makeRequestId();

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
    }

    const limiter = consumeToken(
      `progression-next-targets:${user.id}`,
      RATE_LIMIT_CAPACITY,
      RATE_LIMIT_REFILL_PER_SECOND
    );
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(limiter.retryAfterSeconds) } }
      );
    }

    const exerciseNames = parseExercises(request.url);
    let targets = await getNextTargets(supabase, user.id, exerciseNames);

    if (targets.length === 0) {
      await recomputeProgressionSnapshots(supabase, user.id);
      targets = await getNextTargets(supabase, user.id, exerciseNames);
    }

    return NextResponse.json({
      targets,
      sparse_history: targets.length === 0,
    });
  } catch (error) {
    console.error("progression_next_targets_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Failed to load progression targets.");
  }
}
