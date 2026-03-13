import { createClient } from "../supabase/server";
import { callModel } from "./model";
import { assembleContext } from "./assemble-context";

/**
 * Generates a proactive "Evolutionary Briefing" for the user.
 * Synthesizes recent training, nutrition, and vitals into a narrative.
 */
export async function generateEvolutionaryBriefing(userId: string) {
    const supabase = await createClient();
    
    // 1. Gather context
    const context = await assembleContext(supabase, userId);
    
    // 2. Define the briefing system prompt
    const systemPrompt = `You are Koda, an advanced AI fitness coach. 
Your goal is to provide a "Daily Evolutionary Briefing" — a high-signal, cinematic narrative that connects the dots between a user's recent training, nutrition, vitals, and long-term goals.

Instructions:
- Be cinematic, concise, and proactive.
- Identify one "Primary Adaptation" (e.g., CNS fatigue management, hypertrophy stimulus, aerobic base expansion).
- Provide one "Strategic Correction" (e.g., increase protein due to high volume, adjust sleep for recovery).
- Mention a specific "Historical Echo" from their long-term memory if available (e.g., "This matches your peak output from June 2025").
- Tone: Premium, authoritative, yet encouraging. Not a generic assistant.

Format: 
- 2-3 short, powerful paragraphs.
- JSON response with { "briefing": "...", "primary_focus": "...", "readiness_score": 1-10 }`;

    // 3. Call model
    const response = await callModel({
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Context:\n${context}\n\nGenerate the briefing now.` }
        ],
        model: "openai/gpt-4o", // Premium model for briefings
        temperature: 0.8
    });

    try {
        const briefingData = JSON.parse(response.content);
        
        // 4. Save to user profile
        await supabase
            .from("user_profile")
            .update({
                briefing_json: briefingData,
                last_briefing_at: new Date().toISOString()
            })
            .eq("user_id", userId);

        return briefingData;
    } catch (e) {
        console.error("failed_to_parse_briefing", response.content);
        return { briefing: response.content };
    }
}
