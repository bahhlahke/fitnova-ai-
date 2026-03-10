import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { toLocalDateString } from "@/lib/date/local-date";
import crypto from "crypto";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const WEBHOOK_SECRET = process.env.OPEN_WEARABLES_SECRET ?? "";

type EventType = "sleep" | "activity" | "readiness" | "body";

type OpenWearablesPayload = {
    event_type: EventType;
    user_id: string;
    provider: string;
    data: Record<string, unknown>[];
};

const PROVIDER_CONFIDENCE: Record<string, number> = {
    oura: 0.97,
    whoop: 0.94,
    garmin: 0.84,
    fitbit: 0.8,
    apple_health: 0.72,
    healthkit: 0.72,
};

/** Safely coerce a value to a number or null. */
function num(v: unknown): number | null {
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

/** Return today's date string, or the field from the payload, validated as YYYY-MM-DD. */
function signalDate(d: Record<string, unknown>): string {
    const raw = d.date;
    if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    return toLocalDateString();
}

function providerConfidence(provider: string): number {
    return PROVIDER_CONFIDENCE[provider.toLowerCase()] ?? 0.55;
}



async function enqueueReplay(provider: string, eventType: string, payload: Record<string, unknown>, errorMessage: string) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;
    const admin = createAdminClient(url, key);
    await admin.from("wearable_webhook_replay_queue").insert({
        provider,
        event_type: eventType,
        payload,
        status: "pending",
        error_message: errorMessage,
    });
}
export async function POST(request: Request) {
    const requestId = makeRequestId();

    try {
        const rawBody = await request.text();

        // --- HMAC Signature Verification ---
        // Always enforce when OPEN_WEARABLES_SECRET is set.
        if (WEBHOOK_SECRET) {
            const signature = request.headers.get("x-ow-signature");
            const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
            if (!signature || signature !== expected) {
                console.warn("webhook_signature_mismatch", { requestId });
                return jsonError(401, "AUTH_REQUIRED", "Invalid webhook signature.");
            }
        }

        // --- Parse ---
        let payload: OpenWearablesPayload;
        try {
            payload = JSON.parse(rawBody) as OpenWearablesPayload;
        } catch {
            return jsonError(400, "INVALID_JSON", "Payload must be valid JSON.");
        }

        const { event_type, user_id: kodaUserId, provider = "unknown", data } = payload;

        // Acknowledge test pings with no user_id
        if (!kodaUserId) {
            return NextResponse.json({ status: "ok", message: "Test ping acknowledged." });
        }

        if (!Array.isArray(data) || data.length === 0) {
            return NextResponse.json({ status: "ok", message: "Empty data array — nothing to store." });
        }

        const supabase = await createClient();
        const row = data[0];
        const date = signalDate(row);
        let upsertPayload: Record<string, unknown>;

        // --- Route to the correct handler ---
        if (event_type === "sleep") {
            const durationHours =
                (num(row.duration_seconds) ?? num(row.total_sleep_seconds) ?? num(row.total_sleep_duration) ?? 0) / 3600;
            if (durationHours <= 0) {
                return NextResponse.json({ status: "ok", message: "Sleep duration zero — skipped." });
            }

            upsertPayload = {
                user_id: kodaUserId,
                provider,
                signal_date: date,
                sleep_hours: durationHours,
                sleep_deep_hours:
                    num(row.deep_sleep_seconds) != null ? (num(row.deep_sleep_seconds)! / 3600) :
                    num(row.deep_sleep_duration) != null ? (num(row.deep_sleep_duration)! / 3600) : null,
                sleep_rem_hours:
                    num(row.rem_sleep_seconds) != null ? (num(row.rem_sleep_seconds)! / 3600) :
                    num(row.rem_sleep_duration) != null ? (num(row.rem_sleep_duration)! / 3600) : null,
                recovery_score: num(row.readiness) ?? num(row.readiness_score),
                hrv: num(row.hrv_rmssd) ?? num(row.hrv),
                resting_hr: num(row.resting_heart_rate) ?? num(row.resting_hr),
                spo2_avg: num(row.spo2_avg),
                respiratory_rate_avg: num(row.respiratory_rate_avg),
                raw_payload: { provider_confidence: providerConfidence(provider), source: row },
                updated_at: new Date().toISOString(),
            };

        } else if (event_type === "readiness") {
            upsertPayload = {
                user_id: kodaUserId,
                provider,
                signal_date: date,
                strain_score: num(row.strain) ?? num(row.activity_strain),
                recovery_score: num(row.recovery_score) ?? num(row.readiness) ?? num(row.readiness_score),
                hrv: num(row.hrv_rmssd) ?? num(row.hrv),
                resting_hr: num(row.resting_heart_rate) ?? num(row.resting_hr),
                raw_payload: { provider_confidence: providerConfidence(provider), source: row },
                updated_at: new Date().toISOString(),
            };

        } else if (event_type === "activity") {
            upsertPayload = {
                user_id: kodaUserId,
                provider,
                signal_date: date,
                steps: num(row.steps),
                active_calories: num(row.active_calories),
                workout_hr_avg: num(row.avg_heart_rate) ?? num(row.workout_hr_avg),
                raw_payload: { provider_confidence: providerConfidence(provider), source: row },
                updated_at: new Date().toISOString(),
            };

        } else if (event_type === "body") {
            upsertPayload = {
                user_id: kodaUserId,
                provider,
                signal_date: date,
                blood_glucose_avg: num(row.blood_glucose_avg),
                core_temp_deviation: num(row.core_temperature_delta),
                spo2_avg: num(row.spo2_avg),
                raw_payload: { provider_confidence: providerConfidence(provider), source: row },
                updated_at: new Date().toISOString(),
            };

        } else {
            console.warn("webhook_unknown_event_type", { requestId, event_type });
            return NextResponse.json({ status: "ok", message: `Unknown event type '${event_type}' — ignored.` });
        }

        // Strip undefined/null to avoid overwriting existing data with nulls
        const cleanPayload = Object.fromEntries(
            Object.entries(upsertPayload).filter(([, v]) => v !== null && v !== undefined)
        );

        const { error: upsertError } = await supabase
            .from("connected_signals")
            .upsert(cleanPayload, { onConflict: "user_id,provider,signal_date" });

        if (upsertError) {
            console.error("webhook_upsert_error", {
                requestId,
                event_type,
                provider,
                error: upsertError.message,
                code: upsertError.code,
            });
            await enqueueReplay(provider, event_type, payload as unknown as Record<string, unknown>, upsertError.message);
            // Return 500 so Open Wearables retries the payload
            return jsonError(500, "INTERNAL_ERROR", "Failed to persist biometric signal.");
        }

        return NextResponse.json({ status: "ok", received: true, event_type, provider });

    } catch (error) {
        console.error("webhook_unhandled_error", {
            requestId,
            error: error instanceof Error ? error.message : "unknown",
        });
        await enqueueReplay("unknown", "unknown", { requestId }, error instanceof Error ? error.message : "unknown");
        return jsonError(500, "INTERNAL_ERROR", "Unexpected webhook error.");
    }
}
