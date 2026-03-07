import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { toLocalDateString } from "@/lib/date/local-date";
import crypto from 'crypto';

export const dynamic = "force-dynamic";

// In production, this would be your Open Wearables HMAC secret
const WEBHOOK_SECRET = process.env.OPEN_WEARABLES_SECRET || "simulated_secret_for_local_dev";

type OpenWearablesPayload = {
    event_type: "sleep" | "activity" | "readiness" | "body";
    user_id: string; // The Koda user_id we passed during authentication
    provider: string; // e.g. "oura", "garmin", "apple"
    data: any[];
};

export async function POST(request: Request) {
    const requestId = makeRequestId();

    try {
        // 1. Verify Webhook Signature
        const signature = request.headers.get("x-ow-signature");
        const rawBody = await request.text();

        if (WEBHOOK_SECRET !== "simulated_secret_for_local_dev") {
            const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
            const expectedSignature = hmac.update(rawBody).digest('hex');

            if (signature !== expectedSignature) {
                console.error("Webhook Signature Mismatch");
                return jsonError(401, "AUTH_REQUIRED", "Invalid webhook signature");
            }
        }

        let payload: OpenWearablesPayload;
        try {
            payload = JSON.parse(rawBody) as OpenWearablesPayload;
        } catch {
            return jsonError(400, "INVALID_JSON", "Invalid JSON payload format");
        }

        // 2. Validate the identity
        const kodaUserId = payload.user_id;
        const providerName = payload.provider || "unknown";

        if (!kodaUserId) {
            return NextResponse.json({ status: "success", message: "Acknowledged test payload." });
        }

        const supabase = await createClient();

        // 3. Process the Data based on event type
        // The open-source aggregator standardizes the data

        if (payload.event_type === "sleep" && payload.data.length > 0) {
            const sleepData = payload.data[0];
            const signalDate = sleepData.date ? sleepData.date : toLocalDateString();

            // Extract high-value metrics (Open Wearables format)
            const sleepDurationHours = (sleepData.duration_seconds ?? 0) / 3600;
            const deepSleepHours = (sleepData.deep_sleep_seconds ?? 0) / 3600;
            const remSleepHours = (sleepData.rem_sleep_seconds ?? 0) / 3600;

            const readinessScore = sleepData.readiness ?? null;
            const avgHrv = sleepData.hrv_rmssd ?? null;
            const restingHr = sleepData.resting_heart_rate ?? null;
            const spo2 = sleepData.spo2_avg ?? null;
            const respRate = sleepData.respiratory_rate_avg ?? null;

            if (sleepDurationHours > 0) {
                // Upsert into connected_signals
                const { error: upsertError } = await (supabase as any)
                    .from("connected_signals")
                    .upsert({
                        user_id: kodaUserId,
                        provider: providerName,
                        signal_date: signalDate,
                        sleep_hours: sleepDurationHours,
                        sleep_deep_hours: deepSleepHours > 0 ? deepSleepHours : undefined,
                        sleep_rem_hours: remSleepHours > 0 ? remSleepHours : undefined,
                        hrv: avgHrv,
                        resting_hr: restingHr,
                        spo2_avg: spo2,
                        respiratory_rate_avg: respRate,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id,provider,signal_date' });

                if (upsertError) {
                    console.error("Webhook Upsert Error (Sleep):", upsertError);
                }
            }
        } else if (payload.event_type === "readiness" && payload.data.length > 0) {
            const dailyData = payload.data[0];
            const signalDate = dailyData.date ? dailyData.date : toLocalDateString();

            const strainScore = dailyData.strain ?? null;

            if (strainScore !== null) {
                await (supabase as any).from("connected_signals").upsert({
                    user_id: kodaUserId,
                    provider: providerName,
                    signal_date: signalDate,
                    strain_score: strainScore,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,provider,signal_date' });
            }
        } else if (payload.event_type === "body" && payload.data.length > 0) {
            const bodyData = payload.data[0];
            const signalDate = bodyData.date ? bodyData.date : toLocalDateString();

            // CGM & Core Temp processing
            const avgGlucose = bodyData.blood_glucose_avg ?? null;
            const tempDelta = bodyData.core_temperature_delta ?? null;

            if (avgGlucose !== null || tempDelta !== null) {
                await (supabase as any).from("connected_signals").upsert({
                    user_id: kodaUserId,
                    provider: providerName,
                    signal_date: signalDate,
                    blood_glucose_avg: avgGlucose !== null ? avgGlucose : undefined,
                    core_temp_deviation: tempDelta !== null ? tempDelta : undefined,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,provider,signal_date' });
            }
        }

        return NextResponse.json({ status: "success", received: true });
    } catch (error) {
        console.error("webhook_unhandled_error", {
            requestId,
            error: error instanceof Error ? error.message : "unknown",
        });
        return jsonError(500, "INTERNAL_ERROR", "Failed to process webhook payload.");
    }
}
