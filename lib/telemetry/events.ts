export type ProductEventName =
  | "adapt_session_requested"
  | "adapt_session_applied"
  | "progression_target_applied"
  | "escalation_created"
  | "escalation_replied"
  | "nudge_acknowledged"
  | "ai_feedback_submitted"
  | "readiness_snapshot_created"
  | "plan_mutation_applied"
  | "prescription_blocked"
  | "substitution_policy_triggered"
  | "cv_cue_emitted"
  | "cv_occlusion_suppressed"
  | "funnel_assessment_start"
  | "funnel_assessment_step_completed"
  | "funnel_lead_captured"
  | "funnel_auth_start"
  | "funnel_auth_success"
  | "funnel_checkout_start"
  | "funnel_checkout_success"
  | "funnel_onboarding_start"
  | "funnel_onboarding_complete";

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
