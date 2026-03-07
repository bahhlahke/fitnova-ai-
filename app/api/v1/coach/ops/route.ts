import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

// Ensure the user calling this route has an admin role or bypasses it.
// For the MVP, we just check if they are logged in. In a real scenario, check their role in users table.
async function verifyAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return false;
    }
    // TODO: Add role checking `user.app_metadata.role === 'admin'` when available.
    // For now, allow any logged in user to see the Coach Ops MVP.
    return true;
}

export async function GET(request: Request) {
    const requestId = makeRequestId();

    try {
        const isAuthorized = await verifyAdmin();
        if (!isAuthorized) {
            return jsonError(401, "AUTH_REQUIRED", "Unauthorized.");
        }

        const { searchParams } = new URL(request.url);
        const statusFilter = searchParams.get("status");

        const adminClient = createAdminClient();
        let query = adminClient
            .from("coach_escalations")
            .select("escalation_id, user_id, topic, urgency, preferred_channel, status, assigned_coach_user_id, sla_due_at, first_response_at, resolved_at, created_at")
            .order("created_at", { ascending: false })
            .limit(50);

        if (statusFilter && statusFilter !== 'all') {
            query = query.eq("status", statusFilter);
        }

        const { data, error } = await query;

        if (error) {
            return jsonError(500, "INTERNAL_ERROR", "Failed to load escalation requests.");
        }

        const escalations = (data ?? []) as Array<{ escalation_id: string }>;
        const escalationIds = escalations.map((entry) => entry.escalation_id);

        let latestMessageByEscalation = new Map<string, { body?: string; created_at?: string }>();
        if (escalationIds.length > 0) {
            const messagesRes = await adminClient
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
        console.error("coach_ops_get_unhandled", {
            requestId,
            error: error instanceof Error ? error.message : "unknown",
        });
        return jsonError(500, "INTERNAL_ERROR", "Internal server error.");
    }
}

export async function PATCH(request: Request) {
    const requestId = makeRequestId();

    try {
        const isAuthorized = await verifyAdmin();
        if (!isAuthorized) {
            return jsonError(401, "AUTH_REQUIRED", "Unauthorized.");
        }

        const body = await request.json();
        const escalationId = body.escalation_id;
        const status = body.status;
        const message = body.message;

        if (!escalationId) {
            return jsonError(400, "VALIDATION_ERROR", "escalation_id is required.");
        }

        const adminClient = createAdminClient();
        const updateData: any = {};
        if (status) {
            updateData.status = status;
            if (status === 'resolved') {
                updateData.resolved_at = new Date().toISOString();
            } else if (status === 'investigating') {
                updateData.first_response_at = new Date().toISOString();
            }
        }

        if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await adminClient
                .from("coach_escalations")
                .update(updateData)
                .eq("escalation_id", escalationId);

            if (updateError) {
                return jsonError(500, "INTERNAL_ERROR", "Failed to update escalation.");
            }
        }

        if (message && typeof message === "string" && message.trim()) {
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();

            // Add message logic
            await adminClient.from("coach_escalation_messages").insert({
                escalation_id: escalationId,
                user_id: body.user_id, // Need origin user_id
                sender_type: "coach",
                sender_user_id: user?.id,
                body: message,
                channel: "in_app"
            });
        }

        return NextResponse.json({
            message: "Escalation updated successfully.",
        });

    } catch (error) {
        console.error("coach_ops_patch_unhandled", {
            requestId,
            error: error instanceof Error ? error.message : "unknown",
        });
        return jsonError(500, "INTERNAL_ERROR", "Internal server error.");
    }
}
