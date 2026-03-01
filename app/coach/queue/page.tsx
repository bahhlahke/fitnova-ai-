"use client";

import { useEffect, useState } from "react";
import { PageLayout, Card, CardHeader, Button, Input, Select, ErrorMessage, LoadingState } from "@/components/ui";

type QueueItem = {
  escalation_id: string;
  user_id: string;
  topic: string;
  urgency: "low" | "normal" | "high";
  status: "open" | "assigned" | "closed";
  preferred_channel: "in_app" | "sms" | "email";
  assigned_coach_user_id?: string | null;
  sla_due_at?: string | null;
  latest_message_preview?: string | null;
  created_at: string;
};

export default function CoachQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "assigned" | "closed">("open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyById, setReplyById] = useState<Record<string, string>>({});

  async function loadQueue() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/v1/admin/coach/escalations?${params.toString()}`);
      const body = (await res.json()) as { escalations?: QueueItem[]; error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to load queue.");
      }
      setItems(Array.isArray(body.escalations) ? body.escalations : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load queue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function assignToMe(escalationId: string) {
    await fetch(`/api/v1/admin/coach/escalations/${escalationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "assigned" }),
    });
    await loadQueue();
  }

  async function closeEscalation(escalationId: string) {
    await fetch(`/api/v1/admin/coach/escalations/${escalationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    await loadQueue();
  }

  async function sendReply(escalationId: string) {
    const message = (replyById[escalationId] ?? "").trim();
    if (!message) return;
    await fetch(`/api/v1/admin/coach/escalations/${escalationId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    setReplyById((current) => ({ ...current, [escalationId]: "" }));
    await loadQueue();
  }

  return (
    <PageLayout title="Coach Queue" subtitle="Admin queue for escalations and SLA follow-up" backHref="/" backLabel="Dashboard">
      <Card padding="lg">
        <CardHeader title="Queue" subtitle="Review, assign, and reply" />
        <div className="mt-3 max-w-[220px]">
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="closed">Closed</option>
          </Select>
        </div>
        {error && <ErrorMessage message={error} className="mt-4" />}
        {loading ? (
          <div className="mt-4">
            <LoadingState />
          </div>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-fn-muted">No escalations match this filter.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li key={item.escalation_id} className="rounded-2xl border border-fn-border bg-fn-surface-hover p-4">
                <p className="text-sm font-semibold text-fn-ink">{item.topic}</p>
                <p className="mt-1 text-xs text-fn-muted">
                  {item.status.toUpperCase()} · {item.urgency.toUpperCase()} · {item.preferred_channel.toUpperCase()} · {new Date(item.created_at).toLocaleString()}
                </p>
                {item.sla_due_at && (
                  <p className="mt-1 text-xs text-fn-muted">SLA due: {new Date(item.sla_due_at).toLocaleString()}</p>
                )}
                {item.latest_message_preview && (
                  <p className="mt-2 text-sm text-fn-muted">Latest: {item.latest_message_preview}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.status !== "assigned" && (
                    <Button type="button" size="sm" variant="secondary" onClick={() => void assignToMe(item.escalation_id)}>
                      Assign
                    </Button>
                  )}
                  {item.status !== "closed" && (
                    <Button type="button" size="sm" variant="ghost" className="border border-fn-border" onClick={() => void closeEscalation(item.escalation_id)}>
                      Close
                    </Button>
                  )}
                </div>
                {item.status !== "closed" && (
                  <div className="mt-3 flex gap-2">
                    <Input
                      value={replyById[item.escalation_id] ?? ""}
                      onChange={(event) => setReplyById((current) => ({ ...current, [item.escalation_id]: event.target.value }))}
                      placeholder="Reply to user"
                    />
                    <Button type="button" size="sm" onClick={() => void sendReply(item.escalation_id)}>
                      Send
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageLayout>
  );
}
