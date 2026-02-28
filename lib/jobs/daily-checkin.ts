import twilio from 'twilio';
import { createClient } from "@supabase/supabase-js";
import { normalizePhoneNumber } from "@/lib/phone";

// This file is intended to be executed by a job scheduler like GitHub Actions or Vercel Cron

export async function runDailyBriefing() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (!accountSid || !authToken || !twilioNumber) {
        console.error("Missing Twilio credentials");
        return;
    }

    const client = twilio(accountSid, authToken);

    // 1. Get all pro users with a phone number
    const { data: users, error } = await supabaseAdmin
        .from("user_profile")
        .select("user_id, phone_number, subscription_status")
        .eq("subscription_status", "pro")
        .not("phone_number", "is", null);

    if (error || !users) {
        console.error("Failed to fetch users for briefing", error);
        return;
    }

    // 2. Loop through users and generate/send briefing
    for (const user of users) {
        try {
            // Get today's plan
            const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local format
            const { data: plan } = await supabaseAdmin
                .from("daily_plans")
                .select("plan_json")
                .eq("user_id", user.user_id)
                .eq("date_local", today)
                .maybeSingle();

            let messageBody = "Coach Nova here! Ready to attack the day?";

            if (plan && plan.plan_json) {
                const p = plan.plan_json as any;
                const focus = p.training_plan?.focus || "Recovery";
                const cals = p.nutrition_plan?.calorie_target || "maintenance";
                messageBody = `Coach Nova morning check-in 🚀 Today's focus is ${focus}. Fuel target is ${cals} cals. Let me know when you've crushed it.`;
            }

            await client.messages.create({
                body: messageBody,
                from: twilioNumber,
                to: normalizePhoneNumber(user.phone_number) ?? user.phone_number
            });

            console.log(`Sent briefing to ${user.phone_number}`);
        } catch (e) {
            console.error(`Failed to send SMS to ${user.phone_number}`, e);
        }
    }
}
