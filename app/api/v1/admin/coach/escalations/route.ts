import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isCoachAdmin } from "@/lib/coach/authorization";
import { jsonError, makeRequestId } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = makeRequestId();

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
    if (!isCoachAdmin(user.id)) return jsonError(403, "AUTH_REQUIRED", "Coach admin access required.");

    const status = new URL(request.url).searchParams.get("status");

    let query = supabase
      .from("coach_escalations")
      .select(
        "escalation_id, user_id, topic, urgency, preferred_channel, status, assigned_coach_user_id, sla_due_at, first_response_at, resolved_at, created_at, updated_at"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (status && ["open", "assigned", "closed"].includes(status)) {
      query = query.eq("status", status);
    }

    const escalationsRes = await query;
    if (escalationsRes.error) {
      return jsonError(500, "INTERNAL_ERROR", "Failed to load coach queue.");
    }

    const escalations = (escalationsRes.data ?? []) as Array<{ escalation_id: string }>;
    const ids = escalations.map((entry) => entry.escalation_id);

    let latestMessageByEscalation = new Map<string, { body?: string; created_at?: string }>();
    if (ids.length > 0) {
      const messagesRes = await supabase
        .from("coach_escalation_messages")
        .select("escalation_id, body, created_at")
        .in("escalation_id", ids)
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
      escalations: escalations.map((entry: Record<string, unknown>) => {
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
    console.error("coach_admin_escalations_get_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Internal server error.");
  }
}
