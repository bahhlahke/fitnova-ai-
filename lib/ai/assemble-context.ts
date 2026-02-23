import type { SupabaseClient } from "@supabase/supabase-js";

const SYSTEM_BASE = `You are an elite fitness coach and nutritionist. Be concise, supportive, and evidence-based. When giving advice, include brief rationale and one alternative option when relevant.`;

const MAX_RECENT_LOGS = 5;
const MAX_MESSAGES_IN_CONTEXT = 10;

export interface AssembledContext {
  systemPrompt: string;
}

export async function assembleContext(
  supabase: SupabaseClient,
  userId: string
): Promise<AssembledContext> {
  const [profileRes, workoutsRes, nutritionRes, convoRes] = await Promise.all([
    supabase.from("user_profile").select("*").eq("user_id", userId).single(),
    supabase
      .from("workout_logs")
      .select("date, workout_type, exercises, duration_minutes")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(MAX_RECENT_LOGS),
    supabase
      .from("nutrition_logs")
      .select("date, meals, total_calories")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(MAX_RECENT_LOGS),
    supabase
      .from("ai_conversations")
      .select("user_message_history, ai_reply_summary")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
  ]);

  const parts: string[] = [SYSTEM_BASE];

  if (profileRes.data) {
    const p = profileRes.data as Record<string, unknown>;
    const lines: string[] = ["User profile:"];
    if (p.name) lines.push(`Name: ${p.name}`);
    if (p.age) lines.push(`Age: ${p.age}`);
    if (p.sex) lines.push(`Sex: ${p.sex}`);
    if (p.height != null) lines.push(`Height (cm): ${p.height}`);
    if (p.weight != null) lines.push(`Weight (kg): ${p.weight}`);
    if (Array.isArray(p.goals) && p.goals.length) lines.push(`Goals: ${(p.goals as string[]).join(", ")}`);
    if (p.activity_level) lines.push(`Activity level: ${p.activity_level}`);
    if (Object.keys((p.dietary_preferences as object) || {}).length)
      lines.push(`Diet: ${JSON.stringify(p.dietary_preferences)}`);
    if (Object.keys((p.injuries_limitations as object) || {}).length)
      lines.push(`Injuries/limitations: ${JSON.stringify(p.injuries_limitations)}`);
    if (lines.length > 1) parts.push(lines.join("\n"));
  }

  if (workoutsRes.data?.length) {
    parts.push(
      "Recent workouts:\n" +
        (workoutsRes.data as Record<string, unknown>[])
          .map(
            (w) =>
              `${w.date} ${w.workout_type} ${w.duration_minutes != null ? `(${w.duration_minutes} min)` : ""} — ${JSON.stringify((w as { exercises?: unknown }).exercises).slice(0, 200)}`
          )
          .join("\n")
    );
  }

  if (nutritionRes.data?.length) {
    parts.push(
      "Recent nutrition:\n" +
        (nutritionRes.data as Record<string, unknown>[])
          .map((n) => `${n.date} ${(n as { total_calories?: number }).total_calories ?? "?"} cal — ${JSON.stringify((n as { meals?: unknown }).meals).slice(0, 150)}`)
          .join("\n")
    );
  }

  const history = (convoRes.data as { user_message_history?: Array<{ role: string; content: string }> } | null)
    ?.user_message_history;
  const summary = (convoRes.data as { ai_reply_summary?: string } | null)?.ai_reply_summary;

  if (summary) parts.push(`Previous conversation summary: ${summary}`);

  if (Array.isArray(history) && history.length > 0) {
    const recent = history.slice(-MAX_MESSAGES_IN_CONTEXT);
    parts.push(
      "Recent messages (for continuity):\n" +
        recent.map((m) => `[${m.role}]: ${(m.content as string).slice(0, 300)}`).join("\n")
    );
  }

  return { systemPrompt: parts.join("\n\n") };
}
