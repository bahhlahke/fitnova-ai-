/**
 * Assembles AI coach system prompt from user profile, recent logs, and conversation.
 * Used by POST /api/v1/ai/respond when the user is signed in.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { toLocalDateString } from "@/lib/date/local-date";
import { readUnitSystemFromProfile } from "@/lib/units";

const PERSONA_TONE: Record<string, string> = {
  balanced: "Persona: PhD-level expert. Authoritative, precise, data-driven, and highly individual.",
  intense: "Persona: High-intensity performance specialist. Direct, uncompromising, and focused on peak output. Your tone is challenging and high-accountability, meant to push the user to their absolute limit. No fluff, just results.",
  supportive: "Persona: Empathetic performance coach. Encouraging, patient, and focused on sustainable habits. Your tone is supportive and low-pressure, prioritizing consistency and mental well-being over raw intensity."
};

const EXPERIENCE_GUIDANCE: Record<string, string> = {
  beginner: "Experience: Beginner. Prioritize foundational mechanics, safety, and habit formation. Explain technical terms simply. Avoid overwhelming with complex data; focus on 'win the day' consistency.",
  intermediate: "Experience: Intermediate. Focus on progressive overload, recovery optimization, and refining technique. Use clear performance metrics to drive motivation.",
  advanced: "Experience: Advanced. Focus on marginal gains, high-precision biometric correlations (HRV, Sleep deep phases), and precise RPE/Load management. Speak the language of elite performance mechanics."
};

const MOTIVATION_FOCUS: Record<string, string> = {
  performance: "Focus: Athletic output. Prioritize strength, explosive power, and work capacity. Reference PRs and intensity trends constantly.",
  health: "Focus: Longevity and vitality. Prioritize joint health, cardiovascular health, and sustainable biometric trends (RHR, SpO2).",
  aesthetics: "Focus: Body composition. Prioritize hypertrophy, metabolic stress, and nutritional precision for physique goals.",
  stress: "Focus: Resilience and mental clarity. Prioritize recovery signals, the stress-buffering capacity of exercise, and optimizing for daily energy levels over raw PRs."
};

export function getSystemPrompt(profile: any): string {
  const dev = profile?.devices as Record<string, any> || {};
  const tone = dev.ai_coach_tone || "balanced";
  const exp = profile?.experience_level || "intermediate";
  const mot = profile?.motivational_driver || "performance";

  return `You are an elite AI Performance Coach & Sports Scientist with a PhD in Exercise Physiology and Nutrition. Your expertise is grounded in longitudinal biometric analysis, biomechanics, and evidence-informed protocol design.

You provide Koda AI users with a level of insight typically reserved for Olympic athletes or high-performance teams.

Guidelines:
- ${PERSONA_TONE[tone] || PERSONA_TONE.balanced}
- ${EXPERIENCE_GUIDANCE[exp] || EXPERIENCE_GUIDANCE.intermediate}
- ${MOTIVATION_FOCUS[mot] || MOTIVATION_FOCUS.performance}
- Logic: Synthesize trends across multiple data streams (e.g., HRV vs. Training Intensity, Sleep quality vs. PR performance).
- Output: Concise and actionable. Use bullet points for structural clarity.
- Next Step: Always end with a concrete, data-backed directive for the next 24 hours.
- Masterclass Visuals: You have access to a 100+ item "Elite" movement library with 4K cinematic loops.
- Elite Movement Capabilities: Squats (Back, Front, Goblet, Pistol, Box, Bulgarian), Hinge (Deadlift, RDL, KB Swing), Push (Bench, Incline, Overhead, Dips, Push-up), Pull (Seated Row, Lat Pulldown, Pull-up, Face Pull, Renegade), HIIT (Burpees, Mountain Climbers, Battle Ropes, Sled Push/Pull, Devil Press, Box Jumps), Mobility (Pigeon, 90/90 Switches, Cat-Cow, Scorpion).
- Preferred Coaching: When users ask for demonstrations or new plans, prioritize these movements to showcase "Elite" visual quality.
- Units: Respect preferred units in all suggestions.
- Safety: You are educational support only. Remind users to seek medical care for pain, injury, or severe symptoms.`;
}

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

  const signalsQueryBase = supabase
    .from("connected_signals")
    .select("signal_date, provider, hrv, resting_hr, spo2_avg, sleep_hours, sleep_deep_hours, recovery_score")
    .eq("user_id", userId) as any;
  const signalsQuery = typeof signalsQueryBase.gte === "function"
    ? signalsQueryBase.gte("signal_date", sevenDaysAgo)
    : signalsQueryBase;

  const [profileRes, workoutsRes, nutritionRes, checkInsRes, convoRes, signalsRes, prsRes, squadRes, motionRes, deskRes, historyGraphRes] = await Promise.all([
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
    signalsQuery
      .order("signal_date", { ascending: false })
      .limit(7),
    supabase
      .from("exercise_prs")
      .select("exercise_name, highest_1rm, max_weight, last_achieved_at")
      .eq("user_id", userId)
      .order("highest_1rm", { ascending: false }),
    supabase
      .from("group_members")
      .select("group_id, role, groups(name, description)")
      .eq("user_id", userId),
    supabase
      .from("motion_analysis")
      .select("exercise_name, score, critique, correction, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("coach_nudges")
      .select("message, risk_level, nudge_type, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("physical_history_events")
      .select("event_type, symptom_tags, current_exercise, replacement_exercise, outcome_quality, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const parts: string[] = [getSystemPrompt(profileRes.data)];

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

  if (squadRes.data?.length) {
    const squads = squadRes.data as any[];
    const lines: string[] = ["Elite Squad Membership:"];
    squads.forEach((sm) => {
      lines.push(`- ${sm.groups?.name || "Active Squad"}: ${sm.groups?.description || ""} (Role: ${sm.role})`);
    });
    parts.push(lines.join("\n"));
  }

  if (motionRes.data?.length) {
    const analysis = motionRes.data as any[];
    const lines: string[] = ["Recent Biomechanical (Motion Lab) Analysis:"];
    analysis.forEach((m) => {
      lines.push(`- ${m.exercise_name}: Score ${m.score}/100. Critique: ${m.critique}. Correction: ${m.correction}`);
    });
    parts.push(lines.join("\n"));
  }

  if (deskRes.data?.length) {
    const nudges = deskRes.data as any[];
    const lines: string[] = ["Recent Coach Inbox Proactive Warnings:"];
    nudges.forEach((n) => {
      lines.push(`- [${n.risk_level.toUpperCase()}] ${n.message} (Type: ${n.nudge_type})`);
    });
    parts.push(lines.join("\n"));
  }

  if (historyGraphRes.data?.length) {
    const events = historyGraphRes.data as Array<{
      event_type?: string;
      symptom_tags?: string[];
      current_exercise?: string | null;
      replacement_exercise?: string | null;
      outcome_quality?: number | null;
      created_at?: string;
    }>;
    const lines: string[] = ["Physical History Graph:"];
    events.forEach((event) => {
      lines.push(
        `- ${event.created_at ?? "recent"} ${event.event_type ?? "event"} symptoms=${(event.symptom_tags ?? []).join(", ") || "none"} current=${event.current_exercise ?? "n/a"} replacement=${event.replacement_exercise ?? "n/a"} outcome=${event.outcome_quality ?? "n/a"}`
      );
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
