import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

function getNudgeIdFromUrl(url: string): string {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  return parts[parts.length - 2] ?? "";
}

export async function POST(request: Request) {
  const requestId = makeRequestId();
  const nudgeId = getNudgeIdFromUrl(request.url);

  if (!nudgeId) {
    return jsonError(400, "VALIDATION_ERROR", "nudgeId is required.");
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
    }

    const nudgeRes = await supabase
      .from("coach_nudges")
      .select("nudge_id, user_id, acknowledged_at")
      .eq("nudge_id", nudgeId)
      .maybeSingle();

    if (nudgeRes.error) {
      return jsonError(500, "INTERNAL_ERROR", "Failed to load nudge.");
    }
    if (!nudgeRes.data) {
      return jsonError(404, "VALIDATION_ERROR", "Nudge not found.");
    }
    if ((nudgeRes.data as { user_id: string }).user_id !== user.id) {
      return jsonError(403, "AUTH_REQUIRED", "Not authorized to acknowledge this nudge.");
    }

    const existingAck = (nudgeRes.data as { acknowledged_at?: string | null }).acknowledged_at ?? null;
    if (existingAck) {
      return NextResponse.json({ acknowledged_at: existingAck, idempotent: true });
    }

    const acknowledgedAt = new Date().toISOString();
    const updateRes = await supabase
      .from("coach_nudges")
      .update({ acknowledged_at: acknowledgedAt })
      .eq("nudge_id", nudgeId)
      .eq("user_id", user.id)
      .select("nudge_id, acknowledged_at")
      .single();

    if (updateRes.error) {
      return jsonError(500, "INTERNAL_ERROR", "Failed to acknowledge nudge.");
    }

    return NextResponse.json({
      nudge_id: (updateRes.data as { nudge_id: string }).nudge_id,
      acknowledged_at: (updateRes.data as { acknowledged_at: string }).acknowledged_at,
      idempotent: false,
    });
  } catch (error) {
    console.error("coach_nudge_ack_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Internal server error.");
  }
}
