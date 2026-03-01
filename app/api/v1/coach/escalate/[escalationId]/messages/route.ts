import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { consumeToken } from "@/lib/api/rate-limit";
import { isCoachAdmin } from "@/lib/coach/authorization";

export const dynamic = "force-dynamic";

const RATE_LIMIT_CAPACITY = 20;
const RATE_LIMIT_REFILL_PER_SECOND = 20 / 60;

function getEscalationIdFromUrl(url: string): string {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  return parts[parts.length - 2] ?? "";
}

async function loadEscalation(supabase: any, escalationId: string) {
  const escalationRes = await supabase
    .from("coach_escalations")
    .select("escalation_id, user_id, status")
    .eq("escalation_id", escalationId)
    .maybeSingle();
  if (escalationRes.error) {
    throw new Error(escalationRes.error.message);
  }
  return escalationRes.data as { escalation_id: string; user_id: string; status: string } | null;
}

export async function GET(request: Request) {
  const requestId = makeRequestId();
  const escalationId = getEscalationIdFromUrl(request.url);
  if (!escalationId) {
    return jsonError(400, "VALIDATION_ERROR", "escalationId is required.");
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
    }

    const escalation = await loadEscalation(supabase, escalationId);
    if (!escalation) {
      return jsonError(404, "VALIDATION_ERROR", "Escalation not found.");
    }

    const coachAdmin = isCoachAdmin(user.id);
    if (!coachAdmin && escalation.user_id !== user.id) {
      return jsonError(403, "AUTH_REQUIRED", "Not authorized to view this escalation thread.");
    }

    const messagesRes = await supabase
      .from("coach_escalation_messages")
      .select("escalation_message_id, escalation_id, user_id, sender_type, sender_user_id, body, channel, created_at, updated_at")
      .eq("escalation_id", escalationId)
      .order("created_at", { ascending: true });

    if (messagesRes.error) {
      return jsonError(500, "INTERNAL_ERROR", "Failed to load escalation messages.");
    }

    return NextResponse.json({
      escalation,
      messages: messagesRes.data ?? [],
    });
  } catch (error) {
    console.error("coach_escalation_messages_get_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Internal server error.");
  }
}

export async function POST(request: Request) {
  const requestId = makeRequestId();
  const escalationId = getEscalationIdFromUrl(request.url);
  if (!escalationId) {
    return jsonError(400, "VALIDATION_ERROR", "escalationId is required.");
  }

  let body: { message?: string; channel?: "in_app" | "sms" | "email" };
  try {
    body = (await request.json()) as { message?: string; channel?: "in_app" | "sms" | "email" };
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid JSON body.");
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return jsonError(400, "VALIDATION_ERROR", "message is required.");
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
      `coach-escalation-message:${user.id}`,
      RATE_LIMIT_CAPACITY,
      RATE_LIMIT_REFILL_PER_SECOND
    );
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(limiter.retryAfterSeconds) } }
      );
    }

    const escalation = await loadEscalation(supabase, escalationId);
    if (!escalation) {
      return jsonError(404, "VALIDATION_ERROR", "Escalation not found.");
    }

    const coachAdmin = isCoachAdmin(user.id);
    if (!coachAdmin && escalation.user_id !== user.id) {
      return jsonError(403, "AUTH_REQUIRED", "Not authorized to post in this escalation thread.");
    }

    const senderType = coachAdmin ? "coach" : "user";
    const channel = body.channel === "sms" || body.channel === "email" ? body.channel : "in_app";

    const insertRes = await supabase
      .from("coach_escalation_messages")
      .insert({
        escalation_id: escalationId,
        user_id: escalation.user_id,
        sender_type: senderType,
        sender_user_id: user.id,
        body: message,
        channel,
      })
      .select("escalation_message_id, escalation_id, user_id, sender_type, sender_user_id, body, channel, created_at, updated_at")
      .single();

    if (insertRes.error) {
      return jsonError(500, "INTERNAL_ERROR", "Failed to post escalation message.");
    }

    await supabase.from("coach_escalation_events").insert({
      escalation_id: escalationId,
      user_id: escalation.user_id,
      actor_type: senderType,
      actor_user_id: user.id,
      event_type: "message",
      metadata: { channel },
    });

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (senderType === "coach") {
      updatePayload.status = escalation.status === "open" ? "assigned" : escalation.status;
      updatePayload.first_response_at = new Date().toISOString();
      updatePayload.assigned_coach_user_id = user.id;
    }

    await supabase
      .from("coach_escalations")
      .update(updatePayload)
      .eq("escalation_id", escalationId);

    return NextResponse.json({ message: insertRes.data });
  } catch (error) {
    console.error("coach_escalation_messages_post_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Internal server error.");
  }
}
