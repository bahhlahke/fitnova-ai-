import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { consumeToken } from "@/lib/api/rate-limit";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { syncWhoopSignals } from "@/lib/integrations/sync-whoop";

export const dynamic = "force-dynamic";

const RATE_LIMIT_CAPACITY = 12;
const RATE_LIMIT_REFILL_PER_SECOND = 12 / 60;

export async function POST() {
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
      `whoop-sync:${user.id}`,
      RATE_LIMIT_CAPACITY,
      RATE_LIMIT_REFILL_PER_SECOND
    );
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(limiter.retryAfterSeconds) } }
      );
    }

    const result = await syncWhoopSignals(supabase, user.id);
    return NextResponse.json({ ok: true, provider: "whoop", ...result });
  } catch (error) {
    console.error("whoop_sync_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Failed to sync WHOOP signals.");
  }
}
