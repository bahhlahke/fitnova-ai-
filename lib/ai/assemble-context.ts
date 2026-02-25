/**
 * Assembles AI coach system prompt from user profile, recent logs, and conversation.
 * Used by POST /api/v1/ai/respond when the user is signed in.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { toLocalDateString } from "@/lib/date/local-date";
import { readUnitSystemFromProfile } from "@/lib/units";

const SYSTEM_BASE = `You are the user's personal AI fitness coach and nutritionist for FitNova. Respond as a world-class personal trainer and nutritionist would: evidence-aware, concise, and actionable.

Guidelines:
- Be concise and warm. Use short paragraphs or bullets when it helps clarity.
- Always end with one concrete next step (e.g. "Do X today" or "Try Y at your next meal").
- When giving advice, briefly say why it works; if there's a good alternative, offer one.
- When the user's data supports it, include one short data-driven insight per response—e.g. "Given your last 3 sessions, you're ready for a heavier leg day" or "Your protein has been low on training days; here's why that matters for recovery." Use their profile, recent workouts, nutrition, and check-ins (when provided) to make this insight specific to them.
- Tie training and nutrition in the same response when relevant (e.g. recovery nutrition after a hard session, or meal timing around training).
- Respect their goals, injuries, and preferences from their profile. If they're busy or sore, adapt.
- You are educational support only. Remind them to seek medical care for pain, injury, or health concerns.
- Use the user's preferred units (cm/kg or in/lbs) when mentioning numbers.
- Tailor workout and exercise suggestions using their recent history: (1) Time passed since last workout—if they haven't trained in several days, suggest a manageable comeback; if they trained yesterday, suggest rest, light movement, or a different muscle focus. (2) Past few workouts—avoid repeating the same exercises on back-to-back days; suggest variations or different movements when they've done similar work recently.`;

const MAX_RECENT_LOGS = 5;
const MAX_MESSAGES_IN_CONTEXT = 10;

export interface AssembledContext {
  systemPrompt: string;
}

export async function assembleContext(
  supabase: SupabaseClient,
  userId: string
): Promise<AssembledContext> {
  const today = toLocalDateString();
  const [profileRes, workoutsRes, nutritionRes, checkInsRes, convoRes] = await Promise.all([
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
    if (Object.keys((p.dietary_preferences as object) || {}).length)
      lines.push(`Diet: ${JSON.stringify(p.dietary_preferences)}`);
    if (Object.keys((p.injuries_limitations as object) || {}).length)
      lines.push(`Injuries/limitations: ${JSON.stringify(p.injuries_limitations)}`);
    if (lines.length > 1) parts.push(lines.join("\n"));
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
