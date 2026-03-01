import twilio from "twilio";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { toLocalDateString } from "@/lib/date/local-date";
import { normalizePhoneNumber } from "@/lib/phone";

type ReminderPrefs = {
  daily_plan?: boolean;
  workout_log?: boolean;
  weigh_in?: "weekly" | "off";
};

type UserRow = {
  user_id: string;
  phone_number?: string | null;
  devices?: Record<string, unknown>;
};

type NudgeSpec = {
  nudge_type: "daily_plan" | "workout_log" | "weigh_in" | "retention_risk";
  risk_level: "low" | "medium" | "high";
  message: string;
};

function getReminderPrefs(devices: Record<string, unknown> | null | undefined): ReminderPrefs {
  const raw = ((devices ?? {}) as { reminders?: ReminderPrefs }).reminders;
  return {
    daily_plan: raw?.daily_plan ?? true,
    workout_log: raw?.workout_log ?? true,
    weigh_in: raw?.weigh_in ?? "weekly",
  };
}

function shouldSendSms(accountSid?: string, authToken?: string, from?: string): boolean {
  return Boolean(accountSid && authToken && from);
}

export async function runReminderDispatch(options?: {
  now?: Date;
  supabaseAdmin?: SupabaseClient;
}) {
  const now = options?.now ?? new Date();
  const today = toLocalDateString(now);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase credentials (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are not configured.");
  }

  const supabaseAdmin =
    options?.supabaseAdmin ??
    createClient(supabaseUrl, supabaseServiceKey);

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
  const smsEnabled = shouldSendSms(accountSid, authToken, twilioNumber);
  const twilioClient = smsEnabled ? twilio(accountSid!, authToken!) : null;

  const usersRes = await supabaseAdmin
    .from("user_profile")
    .select("user_id, phone_number, devices")
    .limit(500);

  if (usersRes.error) {
    throw new Error(usersRes.error.message);
  }

  const users = (usersRes.data ?? []) as UserRow[];
  let processed = 0;
  let nudgesCreated = 0;
  let smsSent = 0;

  for (const user of users) {
    processed += 1;

    const reminderPrefs = getReminderPrefs(user.devices);

    const [planRes, workoutRes, progressRes] = await Promise.all([
      supabaseAdmin
        .from("daily_plans")
        .select("plan_id")
        .eq("user_id", user.user_id)
        .eq("date_local", today)
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("workout_logs")
        .select("log_id")
        .eq("user_id", user.user_id)
        .eq("date", today)
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("progress_tracking")
        .select("date")
        .eq("user_id", user.user_id)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const nudges: NudgeSpec[] = [];

    if (reminderPrefs.daily_plan && !planRes.data) {
      nudges.push({
        nudge_type: "daily_plan",
        risk_level: "medium",
        message: "Generate your daily plan to lock in your training and nutrition targets.",
      });
    }

    if (reminderPrefs.workout_log && !workoutRes.data) {
      nudges.push({
        nudge_type: "workout_log",
        risk_level: "medium",
        message: "No workout logged yet today. Complete a focused session or recovery protocol.",
      });
    }

    if (reminderPrefs.weigh_in === "weekly") {
      const lastProgressDate = (progressRes.data as { date?: string } | null)?.date ?? null;
      const daysSinceProgress = lastProgressDate
        ? Math.floor((new Date(`${today}T00:00:00`).getTime() - new Date(`${lastProgressDate}T00:00:00`).getTime()) / (24 * 60 * 60 * 1000))
        : 999;

      if (daysSinceProgress >= 7) {
        nudges.push({
          nudge_type: "weigh_in",
          risk_level: "low",
          message: "Weekly weigh-in is due. Log progress to keep your projections accurate.",
        });
      }
    }

    for (const nudge of nudges) {
      const insertRes = await supabaseAdmin.from("coach_nudges").upsert(
        {
          user_id: user.user_id,
          date_local: today,
          nudge_type: nudge.nudge_type,
          risk_level: nudge.risk_level,
          message: nudge.message,
          delivered_via_sms: false,
        },
        { onConflict: "user_id,date_local,nudge_type" }
      );

      if (!insertRes.error) {
        nudgesCreated += 1;
      }
    }

    if (smsEnabled && twilioClient && user.phone_number && nudges.length > 0) {
      const destination = normalizePhoneNumber(user.phone_number) ?? user.phone_number;
      try {
        await twilioClient.messages.create({
          from: twilioNumber!,
          to: destination,
          body: `Coach Nova reminder: ${nudges[0].message}`,
        });
        smsSent += 1;

        await supabaseAdmin
          .from("coach_nudges")
          .update({ delivered_via_sms: true })
          .eq("user_id", user.user_id)
          .eq("date_local", today)
          .eq("nudge_type", nudges[0].nudge_type);
      } catch (error) {
        console.error("reminder_sms_send_failed", {
          userId: user.user_id,
          error: error instanceof Error ? error.message : "unknown",
        });
      }
    }
  }

  return {
    processed,
    nudges_created: nudgesCreated,
    sms_sent: smsSent,
    date_local: today,
  };
}
