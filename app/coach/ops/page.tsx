"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PageLayout, Card, CardHeader, Select, Input, Button, ErrorMessage, LoadingState } from "@/components/ui";

type OpsEscalationItem = {
    escalation_id: string;
    user_id: string;
    topic: string;
    urgency: "low" | "normal" | "high";
    preferred_channel: "in_app" | "sms" | "email";
    status: "open" | "investigating" | "resolved";
    assigned_coach_user_id?: string | null;
    sla_due_at?: string | null;
    first_response_at?: string | null;
    resolved_at?: string | null;
    latest_message_preview?: string | null;
    latest_message_at?: string | null;
    created_at: string;
};

export default function CoachOpsDashboard() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [requests, setRequests] = useState<OpsEscalationItem[]>([]);
    const [statusFilter, setStatusFilter] = useState("open");
    const [submitting, setSubmitting] = useState<string | null>(null);
    const [messageInputs, setMessageInputs] = useState<Record<string, string>>({});

    const loadRequests = useCallback(async (filter: string = statusFilter) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/coach/ops?status=${filter}`);
            const body = (await res.json()) as { requests?: OpsEscalationItem[]; error?: string };
            if (!res.ok) {
                throw new Error(body.error ?? "Failed to load requests.");
            }
            setRequests(Array.isArray(body.requests) ? body.requests : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load requests.");
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        void loadRequests(statusFilter);
    }, [statusFilter, loadRequests]);

    async function updateEscalation(escalationId: string, updates: { status?: string, message?: string, user_id: string }) {
        setSubmitting(escalationId);
        setError(null);
        try {
            const res = await fetch("/api/v1/coach/ops", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    escalation_id: escalationId,
                    ...updates
                }),
            });

            const body = (await res.json()) as { error?: string };
            if (!res.ok) {
                throw new Error(body.error ?? "Failed to update escalation.");
            }

            setMessageInputs((current) => ({ ...current, [escalationId]: "" }));
            await loadRequests();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update escalation.");
        } finally {
            setSubmitting(null);
        }
    }

    return (
        <PageLayout
            title="Coach Operations"
            subtitle="Manage user escalations and SLAs"
        >
            <Card padding="lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <CardHeader title="Escalation Queue" subtitle="Respond to blockers and questions" />
                    <div className="w-full sm:w-48">
                        <Select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All statuses</option>
                            <option value="open">Open</option>
                            <option value="investigating">Investigating</option>
                            <option value="resolved">Resolved</option>
                        </Select>
                    </div>
                </div>

                {error && <ErrorMessage message={error} />}

                {loading ? (
                    <div className="mt-4">
                        <LoadingState />
                    </div>
                ) : requests.length === 0 ? (
                    <p className="mt-4 text-sm text-fn-muted">
                        No escalations found matching this status.
                    </p>
                ) : (
                    <ul className="mt-4 space-y-3">
                        {requests.map((request) => {
                            const overdue = request.sla_due_at && request.status !== 'resolved' && new Date(request.sla_due_at).getTime() < Date.now();
                            return (
                                <li key={request.escalation_id} className={`rounded-xl border ${overdue ? 'border-red-500/50 outline outline-1 outline-red-500/20' : 'border-fn-border'} bg-fn-surface-hover px-4 py-4 text-sm`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="font-semibold text-fn-ink">{request.topic}</p>
                                        <div className="flex gap-2">
                                            <span className="px-2 py-0.5 rounded-full bg-fn-muted/10 text-xs font-medium text-fn-muted">
                                                {request.urgency.toUpperCase()}
                                            </span>
                                            {overdue && (
                                                <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-xs font-medium text-red-500">
                                                    SLA Breach
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <p className="mt-1 text-xs text-fn-muted mb-2">
                                        User ID: {request.user_id} · Channel: {request.preferred_channel} · Created: {new Date(request.created_at).toLocaleString()}
                                    </p>
                                    {request.sla_due_at && (
                                        <p className="mt-1 text-xs font-medium text-fn-ink/70">
                                            SLA Due: {new Date(request.sla_due_at).toLocaleString()}
                                        </p>
                                    )}
                                    {request.latest_message_preview && (
                                        <div className="mt-3 p-3 bg-fn-surface rounded-lg">
                                            <p className="text-xs text-fn-muted">Latest message:</p>
                                            <p className="text-sm font-medium text-fn-ink mt-1">&quot;{request.latest_message_preview}&quot;</p>
                                        </div>
                                    )}

                                    <div className="mt-4 flex flex-col sm:flex-row gap-3">
                                        <Select
                                            className="w-full sm:w-40"
                                            value={request.status}
                                            onChange={(e) => updateEscalation(request.escalation_id, { status: e.target.value, user_id: request.user_id })}
                                            disabled={submitting === request.escalation_id}
                                        >
                                            <option value="open">Open</option>
                                            <option value="investigating">Investigating</option>
                                            <option value="resolved">Resolved</option>
                                        </Select>

                                        <Input
                                            className="flex-1"
                                            value={messageInputs[request.escalation_id] ?? ""}
                                            onChange={(event) =>
                                                setMessageInputs((current) => ({
                                                    ...current,
                                                    [request.escalation_id]: event.target.value,
                                                }))
                                            }
                                            placeholder="Reply to user (sends via preferred channel)"
                                            disabled={submitting === request.escalation_id}
                                        />
                                        <Button
                                            type="button"
                                            size="sm"
                                            loading={submitting === request.escalation_id}
                                            onClick={() => updateEscalation(request.escalation_id, {
                                                message: messageInputs[request.escalation_id],
                                                status: request.status === 'open' ? 'investigating' : undefined,
                                                user_id: request.user_id
                                            })}
                                        >
                                            Reply
                                        </Button>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </Card>

            <div className="mt-6">
                <Link href="/?focus=ai" className="text-sm font-semibold text-fn-primary hover:underline">
                    Return to Dashboard
                </Link>
            </div>
        </PageLayout>
    );
}
