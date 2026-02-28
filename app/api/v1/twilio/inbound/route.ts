import { NextResponse } from "next/server";
import twilio from "twilio";
import { createClient } from "@supabase/supabase-js";
import { assembleContext } from "@/lib/ai/assemble-context";
import { callModel } from "@/lib/ai/model";
import { normalizePhoneNumber } from "@/lib/phone";

export const dynamic = "force-dynamic";

const MessagingResponse = twilio.twiml.MessagingResponse;
const SAFETY_POLICY = `Safety policy (balanced):
- Provide educational fitness and nutrition coaching only.
- Do not diagnose, treat, or claim to replace licensed medical professionals.
- For severe pain, chest pain, dizziness, or concerning symptoms, tell the user to stop and seek medical care.
- Respect injuries/limitations from profile data and provide safer alternatives.
- Prefer sustainable, evidence-informed advice over extreme protocols.`;

export async function POST(req: Request) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    try {
        const text = await req.text();
        const params = new URLSearchParams(text);

        const From = params.get("From");
        const Body = params.get("Body");

        const twiml = new MessagingResponse();

        if (!From || !Body) {
            twiml.message("Error: Missing body or sender info.");
            return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
        }

        // 1. Find user by phone number
        // We assume the user profile has a 'phone' column or similar. For now we will look up by auth.users metadata if needed.
        // For this implementation, we will mock finding a user or query a specific column if it existed.
        // Assuming `user_profile` has a `phone_number` field:
        const normalizedFrom = normalizePhoneNumber(From) ?? From;
        const { data: profile } = await supabaseAdmin
            .from("user_profile")
            .select("user_id")
            // In a real app we would strictly format the phone number.
            .eq("phone_number", normalizedFrom)
            .maybeSingle();

        if (!profile) {
            twiml.message("Sorry, I don't recognize this number. Please update your FitNova profile with this phone number to enable SMS coaching.");
            return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
        }

        const userId = profile.user_id;

        // 2. Assemble Context
        let systemPrompt = "You are Coach Nova, a personal AI fitness coach via SMS text message. Keep replies extremely brief, conversational, and punchy (under 2 sentences). Give actionable answers.";
        try {
            const { systemPrompt: assembled } = await assembleContext(supabaseAdmin as any, userId);
            systemPrompt = `${assembled}\n\n${SAFETY_POLICY}\n\nRemember: YOU ARE REPLYING VIA SMS. KEEP IT SHORT.`;
        } catch {
            systemPrompt = `${systemPrompt}\n\n${SAFETY_POLICY}`;
        }

        // 3. Call Model
        const { content } = await callModel({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: Body },
            ],
            maxTokens: 150 // Keep it short for SMS
        });

        // 4. Return TwiML response
        twiml.message(content);
        return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });

    } catch (error) {
        console.error("Twilio Inbound Error:", error);
        const twiml = new MessagingResponse();
        twiml.message("Coach Nova is currently offline. Please try again later.");
        return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
    }
}
