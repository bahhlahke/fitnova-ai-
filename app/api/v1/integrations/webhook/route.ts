import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import crypto from "crypto";
import {
  persistOpenWearablesPayload,
  type OpenWearablesPayload,
} from "@/lib/integrations/open-wearables";

export const dynamic = "force-dynamic";

const WEBHOOK_SECRET = process.env.OPEN_WEARABLES_SECRET ?? "";

async function enqueueReplay(
  provider: string,
  eventType: string,
  payload: Record<string, unknown>,
  errorMessage: string
) {
  try {
    const admin = createAdminClient();
    await admin.from("wearable_webhook_replay_queue").insert({
      provider,
      event_type: eventType,
      payload,
      status: "pending",
      error_message: errorMessage,
    });
  } catch (error) {
    console.error("webhook_replay_enqueue_failed", {
      provider,
      eventType,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
export async function POST(request: Request) {
  const requestId = makeRequestId();

  try {
    const rawBody = await request.text();

    if (WEBHOOK_SECRET) {
      const signature = request.headers.get("x-ow-signature");
      const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
      if (!signature || signature !== expected) {
        console.warn("webhook_signature_mismatch", { requestId });
        return jsonError(401, "AUTH_REQUIRED", "Invalid webhook signature.");
      }
    }

    let payload: OpenWearablesPayload;
    try {
      payload = JSON.parse(rawBody) as OpenWearablesPayload;
    } catch {
      return jsonError(400, "INVALID_JSON", "Payload must be valid JSON.");
    }

    const { event_type, user_id: userId, provider = "unknown", data } = payload;

    if (!userId) {
      return NextResponse.json({ status: "ok", message: "Test ping acknowledged." });
    }

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ status: "ok", message: "Empty data array — nothing to store." });
    }

    if (!["sleep", "activity", "readiness", "body"].includes(event_type)) {
      console.warn("webhook_unknown_event_type", { requestId, event_type });
      return NextResponse.json({ status: "ok", message: `Unknown event type '${event_type}' — ignored.` });
    }

    const supabase = createAdminClient();
    let result;
    try {
      result = await persistOpenWearablesPayload(supabase as any, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      await enqueueReplay(provider, event_type, payload as unknown as Record<string, unknown>, message);
      return jsonError(500, "INTERNAL_ERROR", "Failed to persist biometric signal.");
    }

    return NextResponse.json({
      status: "ok",
      received: true,
      event_type,
      provider,
      processed: result.processed,
      skipped: result.skipped,
    });
  } catch (error) {
    console.error("webhook_unhandled_error", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    await enqueueReplay("unknown", "unknown", { requestId }, error instanceof Error ? error.message : "unknown");
    return jsonError(500, "INTERNAL_ERROR", "Unexpected webhook error.");
  }
}
