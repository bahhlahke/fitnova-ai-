import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { consumeToken } from "@/lib/api/rate-limit";
import { computeSlaDueAt } from "@/lib/coach/sla";

export const dynamic = "force-dynamic";

type EscalationRequest = {
  topic?: string;
  urgency?: "low" | "normal" | "high";
  details?: string;
  preferred_channel?: "in_app" | "sms" | "email";
};

const RATE_LIMIT_CAPACITY = 8;
const RATE_LIMIT_REFILL_PER_SECOND = 8 / 60;

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

    const { data, error } = await supabase
      .from("coach_escalations")
      .select("escalation_id, topic, urgency, preferred_channel, status, assigned_coach_user_id, sla_due_at, first_response_at, resolved_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return jsonError(500, "INTERNAL_ERROR", "Failed to load escalation requests.");
    }

    const escalations = (data ?? []) as Array<{ escalation_id: string }>;
    const escalationIds = escalations.map((entry) => entry.escalation_id);

    let latestMessageByEscalation = new Map<string, { body?: string; created_at?: string }>();
    if (escalationIds.length > 0) {
      const messagesRes = await supabase
        .from("coach_escalation_messages")
        .select("escalation_id, body, created_at")
        .in("escalation_id", escalationIds)
        .order("created_at", { ascending: false });

      if (!messagesRes.error && Array.isArray(messagesRes.data)) {
        for (const row of messagesRes.data as Array<{ escalation_id: string; body?: string; created_at?: string }>) {
          if (!latestMessageByEscalation.has(row.escalation_id)) {
            latestMessageByEscalation.set(row.escalation_id, row);
          }
        }
      }
    }

    return NextResponse.json({
      requests: (data ?? []).map((entry: Record<string, unknown>) => {
        const escalationId = String(entry.escalation_id ?? "");
        const latest = latestMessageByEscalation.get(escalationId);
        return {
          ...entry,
          latest_message_preview: latest?.body?.slice(0, 140) ?? null,
          latest_message_at: latest?.created_at ?? null,
        };
      }),
    });
  } catch (error) {
    console.error("coach_escalation_get_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Internal server error.");
  }
}

export async function POST(request: Request) {
  const requestId = makeRequestId();

  let body: EscalationRequest;
  try {
    body = (await request.json()) as EscalationRequest;
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid JSON body.");
  }

  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  const urgency = body.urgency === "low" || body.urgency === "high" ? body.urgency : "normal";
  const preferredChannel = body.preferred_channel === "sms" || body.preferred_channel === "email" ? body.preferred_channel : "in_app";
  const details = typeof body.details === "string" ? body.details.trim() : "";

  if (!topic) {
    return jsonError(400, "VALIDATION_ERROR", "topic is required.");
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
      `coach-escalate:${user.id}`,
      RATE_LIMIT_CAPACITY,
      RATE_LIMIT_REFILL_PER_SECOND
    );
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(limiter.retryAfterSeconds) } }
      );
    }

    const now = new Date();
    const slaDueAt = computeSlaDueAt(urgency, now);

    const insertRes = await supabase
      .from("coach_escalations")
      .insert({
        user_id: user.id,
        topic,
        urgency,
        details: details || null,
        preferred_channel: preferredChannel,
        status: "open",
        sla_due_at: slaDueAt,
      })
      .select("escalation_id, status, created_at, sla_due_at")
      .single();

    if (insertRes.error) {
      return jsonError(500, "INTERNAL_ERROR", "Failed to submit escalation request.");
    }

    const escalationId = (insertRes.data as { escalation_id: string }).escalation_id;
    if (details) {
      await supabase.from("coach_escalation_messages").insert({
        escalation_id: escalationId,
        user_id: user.id,
        sender_type: "user",
        sender_user_id: user.id,
        body: details,
        channel: preferredChannel,
      });
    }
    await supabase.from("coach_escalation_events").insert({
      escalation_id: escalationId,
      user_id: user.id,
      actor_type: "user",
      actor_user_id: user.id,
      event_type: "created",
      metadata: { topic, urgency, preferred_channel: preferredChannel },
    });

    return NextResponse.json({
      request: insertRes.data,
      message: "Coach escalation request submitted.",
    });
  } catch (error) {
    console.error("coach_escalation_post_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Internal server error.");
  }
}
