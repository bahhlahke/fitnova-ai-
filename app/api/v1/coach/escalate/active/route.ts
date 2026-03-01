import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

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

    const escalationRes = await supabase
      .from("coach_escalations")
      .select("escalation_id, topic, urgency, status, sla_due_at, assigned_coach_user_id, created_at")
      .eq("user_id", user.id)
      .in("status", ["open", "assigned"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (escalationRes.error) {
      return jsonError(500, "INTERNAL_ERROR", "Failed to load active escalation.");
    }

    const escalation = escalationRes.data as
      | {
          escalation_id: string;
          topic: string;
          urgency: string;
          status: string;
          sla_due_at?: string | null;
          assigned_coach_user_id?: string | null;
          created_at: string;
        }
      | null;

    if (!escalation) {
      return NextResponse.json({ active: null });
    }

    const messageRes = await supabase
      .from("coach_escalation_messages")
      .select("body, sender_type, created_at")
      .eq("escalation_id", escalation.escalation_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      active: {
        ...escalation,
        latest_message: messageRes.data ?? null,
      },
    });
  } catch (error) {
    console.error("coach_escalation_active_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Internal server error.");
  }
}
