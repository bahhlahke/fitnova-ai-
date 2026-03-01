import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isCoachAdmin } from "@/lib/coach/authorization";
import { jsonError, makeRequestId } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

function getEscalationId(url: string): string {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  return parts[parts.length - 2] ?? "";
}

export async function POST(request: Request) {
  const requestId = makeRequestId();
  const escalationId = getEscalationId(request.url);

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

    if (!user) return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
    if (!isCoachAdmin(user.id)) return jsonError(403, "AUTH_REQUIRED", "Coach admin access required.");

    const escalationRes = await supabase
      .from("coach_escalations")
      .select("escalation_id, user_id, status")
      .eq("escalation_id", escalationId)
      .maybeSingle();

    if (escalationRes.error) {
      return jsonError(500, "INTERNAL_ERROR", "Failed to load escalation.");
    }
    if (!escalationRes.data) {
      return jsonError(404, "VALIDATION_ERROR", "Escalation not found.");
    }

    const channel = body.channel === "sms" || body.channel === "email" ? body.channel : "in_app";
    const insertRes = await supabase
      .from("coach_escalation_messages")
      .insert({
        escalation_id: escalationId,
        user_id: escalationRes.data.user_id,
        sender_type: "coach",
        sender_user_id: user.id,
        body: message,
        channel,
      })
      .select("escalation_message_id, escalation_id, user_id, sender_type, sender_user_id, body, channel, created_at, updated_at")
      .single();

    if (insertRes.error) {
      return jsonError(500, "INTERNAL_ERROR", "Failed to post coach reply.");
    }

    await supabase
      .from("coach_escalations")
      .update({
        status: escalationRes.data.status === "open" ? "assigned" : escalationRes.data.status,
        assigned_coach_user_id: user.id,
        first_response_at: new Date().toISOString(),
      })
      .eq("escalation_id", escalationId);

    await supabase.from("coach_escalation_events").insert({
      escalation_id: escalationId,
      user_id: escalationRes.data.user_id,
      actor_type: "coach",
      actor_user_id: user.id,
      event_type: "message",
      metadata: { channel, source: "admin_reply" },
    });

    return NextResponse.json({ message: insertRes.data });
  } catch (error) {
    console.error("coach_admin_escalation_reply_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Internal server error.");
  }
}
