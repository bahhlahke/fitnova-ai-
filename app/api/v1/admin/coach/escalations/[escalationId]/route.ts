import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isCoachAdmin } from "@/lib/coach/authorization";
import { jsonError, makeRequestId } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

function getEscalationId(url: string): string {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

export async function PATCH(request: Request) {
  const requestId = makeRequestId();
  const escalationId = getEscalationId(request.url);

  if (!escalationId) {
    return jsonError(400, "VALIDATION_ERROR", "escalationId is required.");
  }

  let body: {
    status?: "open" | "assigned" | "closed";
    assigned_coach_user_id?: string | null;
    sla_due_at?: string | null;
  };
  try {
    body = (await request.json()) as {
      status?: "open" | "assigned" | "closed";
      assigned_coach_user_id?: string | null;
      sla_due_at?: string | null;
    };
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid JSON body.");
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
    if (!isCoachAdmin(user.id)) return jsonError(403, "AUTH_REQUIRED", "Coach admin access required.");

    const updatePayload: Record<string, unknown> = {};
    if (body.status && ["open", "assigned", "closed"].includes(body.status)) {
      updatePayload.status = body.status;
      if (body.status === "closed") {
        updatePayload.resolved_at = new Date().toISOString();
      }
    }
    if (typeof body.assigned_coach_user_id === "string" || body.assigned_coach_user_id === null) {
      updatePayload.assigned_coach_user_id = body.assigned_coach_user_id;
    }
    if (typeof body.sla_due_at === "string" || body.sla_due_at === null) {
      updatePayload.sla_due_at = body.sla_due_at;
    }

    if (Object.keys(updatePayload).length === 0) {
      return jsonError(400, "VALIDATION_ERROR", "No valid update fields provided.");
    }

    const updateRes = await supabase
      .from("coach_escalations")
      .update(updatePayload)
      .eq("escalation_id", escalationId)
      .select("escalation_id, user_id, topic, urgency, preferred_channel, status, assigned_coach_user_id, sla_due_at, first_response_at, resolved_at, created_at, updated_at")
      .single();

    if (updateRes.error) {
      return jsonError(500, "INTERNAL_ERROR", "Failed to update escalation.");
    }

    await supabase.from("coach_escalation_events").insert({
      escalation_id: escalationId,
      user_id: (updateRes.data as { user_id: string }).user_id,
      actor_type: "coach",
      actor_user_id: user.id,
      event_type: "status_changed",
      metadata: updatePayload,
    });

    return NextResponse.json({ escalation: updateRes.data });
  } catch (error) {
    console.error("coach_admin_escalation_patch_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Internal server error.");
  }
}
