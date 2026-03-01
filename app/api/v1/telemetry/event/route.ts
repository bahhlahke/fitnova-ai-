import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { consumeToken } from "@/lib/api/rate-limit";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { insertProductEvent } from "@/lib/telemetry/events";

export const dynamic = "force-dynamic";

const RATE_LIMIT_CAPACITY = 60;
const RATE_LIMIT_REFILL_PER_SECOND = 60 / 60;

type EventRequest = {
  event_name?: string;
  event_props?: Record<string, unknown>;
  session_id?: string | null;
};

export async function POST(request: Request) {
  const requestId = makeRequestId();

  let body: EventRequest;
  try {
    body = (await request.json()) as EventRequest;
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid JSON body.");
  }

  const eventName = typeof body.event_name === "string" ? body.event_name.trim() : "";
  const eventProps = body.event_props && typeof body.event_props === "object" ? body.event_props : {};
  const sessionId = typeof body.session_id === "string" ? body.session_id : null;

  if (!eventName) {
    return jsonError(400, "VALIDATION_ERROR", "event_name is required.");
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const limiter = consumeToken(
      `telemetry:${user?.id ?? "anon"}`,
      RATE_LIMIT_CAPACITY,
      RATE_LIMIT_REFILL_PER_SECOND
    );
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(limiter.retryAfterSeconds) } }
      );
    }

    await insertProductEvent(supabase, user?.id ?? null, eventName, eventProps, sessionId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("telemetry_event_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Failed to log telemetry event.");
  }
}
