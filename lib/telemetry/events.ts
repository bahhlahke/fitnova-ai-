export type ProductEventName =
  | "adapt_session_requested"
  | "adapt_session_applied"
  | "progression_target_applied"
  | "escalation_created"
  | "escalation_replied"
  | "nudge_acknowledged"
  | "ai_feedback_submitted";

export async function trackProductEvent(
  eventName: ProductEventName,
  eventProps: Record<string, unknown> = {},
  sessionId?: string
): Promise<void> {
  try {
    await fetch("/api/v1/telemetry/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_name: eventName, event_props: eventProps, session_id: sessionId }),
      keepalive: true,
    });
  } catch {
    // Non-blocking telemetry.
  }
}

export async function insertProductEvent(
  supabase: any,
  userId: string | null,
  eventName: string,
  eventProps: Record<string, unknown> = {},
  sessionId: string | null = null
): Promise<void> {
  await supabase.from("product_events").insert({
    user_id: userId,
    event_name: eventName,
    event_props: eventProps,
    session_id: sessionId,
  });
}
