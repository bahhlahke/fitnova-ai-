"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageLayout, Card, CardHeader, Input, Select, Textarea, Button, ErrorMessage, LoadingState } from "@/components/ui";

type EscalationItem = {
  escalation_id: string;
  topic: string;
  urgency: "low" | "normal" | "high";
  preferred_channel: "in_app" | "sms" | "email";
  status: "open" | "assigned" | "closed";
  assigned_coach_user_id?: string | null;
  sla_due_at?: string | null;
  first_response_at?: string | null;
  resolved_at?: string | null;
  latest_message_preview?: string | null;
  latest_message_at?: string | null;
  created_at: string;
};

export default function CoachEscalationPage() {
  const [topic, setTopic] = useState("");
  const [details, setDetails] = useState("");
  const [urgency, setUrgency] = useState<"low" | "normal" | "high">("normal");
  const [preferredChannel, setPreferredChannel] = useState<"in_app" | "sms" | "email">("in_app");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requests, setRequests] = useState<EscalationItem[]>([]);
  const [messageByEscalation, setMessageByEscalation] = useState<Record<string, string>>({});

  async function loadRequests() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/coach/escalate");
      const body = (await res.json()) as { requests?: EscalationItem[]; error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to load requests.");
      }
      setRequests(Array.isArray(body.requests) ? body.requests : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!topic.trim()) {
      setError("Topic is required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/v1/coach/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          urgency,
          details,
          preferred_channel: preferredChannel,
        }),
      });
      const body = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to submit escalation request.");
      }

      setSuccess(body.message ?? "Escalation request submitted.");
      setTopic("");
      setDetails("");
      setUrgency("normal");
      setPreferredChannel("in_app");
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit escalation request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function sendFollowUp(escalationId: string) {
    const message = (messageByEscalation[escalationId] ?? "").trim();
    if (!message) {
      setError("Message is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/coach/escalate/${escalationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to send message.");
      }
      setMessageByEscalation((current) => ({ ...current, [escalationId]: "" }));
      setSuccess("Follow-up message sent.");
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageLayout
      title="Coach Escalation"
      subtitle="Hybrid support for blockers, injury concerns, and plan complexity"
      backHref="/"
      backLabel="Dashboard"
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card padding="lg">
          <CardHeader title="Request Coach Review" subtitle="Escalate when AI guidance needs human oversight" />
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-semibold text-fn-ink" htmlFor="topic">Topic</label>
              <Input
                id="topic"
                className="mt-1"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="e.g. Knee pain is blocking squat progression"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-fn-ink" htmlFor="urgency">Urgency</label>
                <Select
                  id="urgency"
                  className="mt-1"
                  value={urgency}
                  onChange={(event) =>
                    setUrgency(event.target.value === "high" || event.target.value === "low" ? event.target.value : "normal")
                  }
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </Select>
              </div>
              <div>
                <label className="text-sm font-semibold text-fn-ink" htmlFor="channel">Preferred channel</label>
                <Select
                  id="channel"
                  className="mt-1"
                  value={preferredChannel}
                  onChange={(event) =>
                    setPreferredChannel(
                      event.target.value === "sms" || event.target.value === "email"
                        ? event.target.value
                        : "in_app"
                    )
                  }
                >
                  <option value="in_app">In-app</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-fn-ink" htmlFor="details">Details</label>
              <Textarea
                id="details"
                className="mt-1"
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                rows={4}
                placeholder="Add context, recent logs, and what has/has not worked."
              />
            </div>
            {error && <ErrorMessage message={error} />}
            {success && (
              <p className="rounded-xl border border-fn-accent/20 bg-fn-accent/10 px-3 py-2 text-sm text-fn-accent">
                {success}
              </p>
            )}
            <Button type="submit" loading={submitting} className="w-full">
              Submit escalation
            </Button>
          </form>
        </Card>

        <Card padding="lg">
          <CardHeader title="Recent Requests" subtitle="Track status of your escalation queue" />
          {loading ? (
            <div className="mt-4">
              <LoadingState />
            </div>
          ) : requests.length === 0 ? (
            <p className="mt-4 text-sm text-fn-muted">
              No escalation requests yet. Use this flow when you need human review.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {requests.map((request) => (
                <li key={request.escalation_id} className="rounded-xl border border-fn-border bg-fn-surface-hover px-3 py-3 text-sm">
                  <p className="font-semibold text-fn-ink">{request.topic}</p>
                  <p className="mt-1 text-xs text-fn-muted">
                    {request.status.toUpperCase()} · {request.urgency.toUpperCase()} · {request.preferred_channel.toUpperCase()} · {new Date(request.created_at).toLocaleString()}
                  </p>
                  {request.sla_due_at && (
                    <p className="mt-1 text-xs text-fn-muted">
                      SLA target: {new Date(request.sla_due_at).toLocaleString()}
                    </p>
                  )}
                  {request.latest_message_preview && (
                    <p className="mt-2 text-xs text-fn-muted">
                      Latest: {request.latest_message_preview}
                    </p>
                  )}
                  {request.status !== "closed" && (
                    <div className="mt-2 flex gap-2">
                      <Input
                        value={messageByEscalation[request.escalation_id] ?? ""}
                        onChange={(event) =>
                          setMessageByEscalation((current) => ({
                            ...current,
                            [request.escalation_id]: event.target.value,
                          }))
                        }
                        placeholder="Add follow-up context for your coach"
                      />
                      <Button
                        type="button"
                        size="sm"
                        loading={submitting}
                        onClick={() => void sendFollowUp(request.escalation_id)}
                      >
                        Send
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Link href="/?focus=ai" className="mt-5 inline-block text-sm font-semibold text-fn-primary hover:underline">
            Return to Dashboard AI
          </Link>
        </Card>
      </div>
    </PageLayout>
  );
}
