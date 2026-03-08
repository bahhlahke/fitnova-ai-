/**
 * Assembles AI coach system prompt from user profile, recent logs, and conversation.
 * Used by POST /api/v1/ai/respond when the user is signed in.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { toLocalDateString } from "@/lib/date/local-date";
import { readUnitSystemFromProfile } from "@/lib/units";

const SYSTEM_BASE = `You are an elite AI Performance Coach & Sports Scientist with a PhD in Exercise Physiology and Nutrition. Your expertise is grounded in longitudinal biometric analysis, biomechanics, and evidence-informed protocol design.

You provide Koda AI users with a level of insight typically reserved for Olympic athletes or high-performance teams.

Guidelines:
- Persona: PhD-level expert. Authoritative, precise, data-driven, and highly individual.
- Logic: Synthesize trends across multiple data streams (e.g., HRV vs. Training Intensity, Sleep quality vs. PR performance).
- Output: Concise and actionable. Use bullet points for structural clarity.
- Next Step: Always end with a concrete, data-backed directive for the next 24 hours.
- Contextual Awareness: 
    1. Recovery Analysis: Compare recent training volume against recovery signals (HRV, sleep, soreness). 
    2. Progression Analysis: Reference their Personal Records (PRs) when suggesting intensities.
    3. Pattern Recognition: Identify correlations like "You tend to hit PRs after 8h of sleep" or "Your HRV dips significantly after heavy leg days".
- Units: Respect preferred units in all suggestions.
- Safety: You are educational support only. Remind users to seek medical care for pain, injury, or severe symptoms.`;

const MAX_RECENT_LOGS = 14;
const MAX_MESSAGES_IN_CONTEXT = 10;

export interface AssembledContext {
  systemPrompt: string;
}

export async function assembleContext(
  supabase: SupabaseClient,
  userId: string
): Promise<AssembledContext> {
  const today = toLocalDateString();
  const sevenDaysAgo = new Date(new Date(`${today}T12:00:00`).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [profileRes, workoutsRes, nutritionRes, checkInsRes, convoRes, signalsRes, prsRes] = await Promise.all([
    supabase.from("user_profile").select("*").eq("user_id", userId).maybeSingle(),
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
      .from("check_ins")
      .select("date_local, energy_score, sleep_hours, soreness_notes, adherence_score")
      .eq("user_id", userId)
      .order("date_local", { ascending: false })
      .limit(5),
    supabase
      .from("ai_conversations")
      .select("user_message_history, ai_reply_summary")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("connected_signals")
      .select("signal_date, provider, hrv, resting_hr, spo2_avg, sleep_hours, sleep_deep_hours, recovery_score")
      .eq("user_id", userId)
      .gte("signal_date", sevenDaysAgo)
      .order("signal_date", { ascending: false })
      .limit(7),
    supabase
      .from("exercise_prs")
      .select("exercise_name, highest_1rm, max_weight, last_achieved_at")
      .eq("user_id", userId)
      .order("highest_1rm", { ascending: false }),
  ]);

  const parts: string[] = [SYSTEM_BASE];

  if (profileRes.data) {
    const p = profileRes.data as Record<string, unknown>;
    const units = readUnitSystemFromProfile(p);
    const lines: string[] = ["User profile:"];
    if (p.name) lines.push(`Name: ${p.name}`);
    if (p.age) lines.push(`Age: ${p.age}`);
    if (p.sex) lines.push(`Sex: ${p.sex}`);
    if (p.height != null) lines.push(`Height (cm): ${p.height}`);
    if (p.weight != null) lines.push(`Weight (kg): ${p.weight}`);
    lines.push(`Preferred units: ${units === "imperial" ? "in/lbs" : "cm/kg"}`);
    if (Array.isArray(p.goals) && p.goals.length) lines.push(`Goals: ${(p.goals as string[]).join(", ")}`);
    if (p.activity_level) lines.push(`Activity level: ${p.activity_level}`);
    if (p.dietary_preferences && Object.keys(p.dietary_preferences as object).length)
      lines.push(`Diet: ${JSON.stringify(p.dietary_preferences)}`);
    if (p.injuries_limitations && Object.keys(p.injuries_limitations as object).length)
      lines.push(`Injuries/limitations: ${JSON.stringify(p.injuries_limitations)}`);
    if (lines.length > 1) parts.push(lines.join("\n"));
  }

  if (signalsRes.data?.length) {
    const signalList = signalsRes.data as any[];
    const lines: string[] = ["Vitals Trend (Last 7 Days):"];
    signalList.forEach((s) => {
      const parts = [
        `Date: ${s.signal_date}`,
        s.hrv ? `HRV: ${Math.round(s.hrv)}ms` : null,
        s.resting_hr ? `RHR: ${Math.round(s.resting_hr)}bpm` : null,
        s.recovery_score ? `Recovery: ${s.recovery_score}%` : null,
        s.sleep_hours ? `Sleep: ${s.sleep_hours}h (${s.sleep_deep_hours ?? "?"}h deep)` : null
      ].filter(Boolean);
      lines.push(parts.join(", "));
    });
    parts.push(lines.join("\n"));
  }

  if (prsRes.data?.length) {
    const prList = prsRes.data as any[];
    const lines: string[] = ["Personal Records (Historic PRs):"];
    prList.forEach((pr) => {
      lines.push(`- ${pr.exercise_name}: Est. 1RM ${Math.round(pr.highest_1rm)}kg (Best weight: ${pr.max_weight}kg)`);
    });
    parts.push(lines.join("\n"));
  }

  if (workoutsRes.data?.length) {
    const workoutList = workoutsRes.data as Array<{
      date: string;
      workout_type?: string;
      duration_minutes?: number;
      exercises?: Array<{ name?: string }>;
    }>;
    const lastDate = workoutList[0]?.date;
    const daysSinceLast =
      lastDate != null
        ? Math.floor(
          (new Date(today).setHours(0, 0, 0, 0) - new Date(lastDate).setHours(0, 0, 0, 0)) /
          (24 * 60 * 60 * 1000)
        )
        : null;

    let workoutBlock =
      "Recent workouts:\n" +
      workoutList
        .map(
          (w) =>
            `${w.date} ${w.workout_type ?? ""} ${w.duration_minutes != null ? `(${w.duration_minutes} min)` : ""} — ${(w.exercises ?? []).map((e) => e.name).filter(Boolean).join(", ") || JSON.stringify(w.exercises).slice(0, 120)}`
        )
        .join("\n");
    if (lastDate != null && daysSinceLast !== null) {
      workoutBlock =
        `Last workout: ${lastDate} (${daysSinceLast === 0 ? "today" : daysSinceLast === 1 ? "yesterday" : `${daysSinceLast} days ago`}).\n` +
        workoutBlock;
    }
    parts.push(workoutBlock);
  }

  if (nutritionRes.data?.length) {
    parts.push(
      "Recent nutrition:\n" +
      (nutritionRes.data as Record<string, unknown>[])
        .map((n) => `${n.date} ${(n as { total_calories?: number }).total_calories ?? "?"} cal — ${JSON.stringify((n as { meals?: unknown }).meals).slice(0, 150)}`)
        .join("\n")
    );
  }

  if (checkInsRes.data?.length) {
    const checkInList = checkInsRes.data as Array<{
      date_local: string;
      energy_score?: number | null;
      sleep_hours?: number | null;
      soreness_notes?: string | null;
      adherence_score?: number | null;
    }>;
    const todayCheckIn = checkInList.find((c) => c.date_local === today);
    let checkInBlock = "Recent check-ins:\n" + checkInList.map((c) => `${c.date_local} energy=${c.energy_score ?? "?"} sleep=${c.sleep_hours ?? "?"}h ${c.soreness_notes ? `soreness: ${c.soreness_notes}` : ""}`).join("\n");
    if (todayCheckIn) {
      checkInBlock = `Today's check-in: energy ${todayCheckIn.energy_score ?? "?"}/5, sleep ${todayCheckIn.sleep_hours ?? "?"}h${todayCheckIn.soreness_notes ? `, soreness/notes: ${todayCheckIn.soreness_notes}` : ""}.\n` + checkInBlock;
    }
    parts.push(checkInBlock);
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

