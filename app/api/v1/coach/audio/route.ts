/**
 * POST /api/v1/coach/audio
 *
 * Generates a motivational coaching script via GPT-4o-mini, then synthesizes
 * it to audio using OpenAI TTS (model: tts-1, voice: nova).
 *
 * Returns:
 *  - If OPENAI_API_KEY is set:   audio/mpeg binary stream
 *  - If key is missing:          JSON { script } so client can use browser TTS fallback
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const OPENAI_URL = "https://api.openai.com/v1";

type ExerciseContext = {
    name?: string;
    reps?: string;
    intensity?: string;
    tempo?: string;
    breathing?: string;
    intent?: string;
    notes?: string;
    rationale?: string;
    setIndex?: number;
    totalSets?: number;
    focus?: string;
};

function withTimeout(ms: number) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    return { signal: controller.signal, done: () => clearTimeout(id) };
}

function buildScript(
    context: string,
    metrics?: Record<string, unknown>,
    details?: ExerciseContext,
): string {
    // Vivid, personality-filled scripts — warm, fun, encouraging, a little flirty
    switch (context) {
        case "start_workout":
            if (details?.focus) {
                return `Okay, let's go. Today's session is about ${details.focus}. Stay locked in, move with intention, and let me coach you through each effort.`;
            }
            return "Okay, let's GO. You showed up, and that already puts you ahead of most people. I'm going to push you today — but I promise you'll love what you see on the other side. Let's build something.";
        case "start_set": {
            const exercise = details?.name ?? "this movement";
            const setLabel = details?.setIndex && details?.totalSets
                ? `set ${details.setIndex} of ${details.totalSets}`
                : "this set";
            const reps = details?.reps ? `Target ${details.reps}.` : "";
            const intensity = details?.intensity ? `${details.intensity} effort.` : "";
            const technique = [details?.tempo, details?.breathing, details?.intent]
                .filter(Boolean)
                .join(" ");
            const reminder = details?.notes ?? details?.rationale ?? "";

            return `Alright, ${setLabel} on ${exercise}. ${reps} ${intensity} ${technique} ${reminder}`.replace(/\s+/g, " ").trim();
        }
        case "finish_set": {
            const hrv = typeof metrics?.hrv === "number" ? metrics.hrv : null;
            const nextCue = details?.name ? `Stay ready for ${details.name}.` : "";
            if (hrv && hrv >= 80) {
                return `Nice work! Your recovery is looking great — ${hrv} on the HRV. You've got plenty in the tank. Take a full breath, then let's hit the next one even harder. ${nextCue}`.trim();
            }
            if (hrv && hrv < 70) {
                return `Good set! Your body is working hard today — keep that rest period full so you can come back strong. Quality over ego. ${nextCue}`.trim();
            }
            return `That's what I'm talking about! Take a real breath, shake it out, let the muscles reload. You earned this rest. ${nextCue}`.trim();
        }
        case "finish_workout":
            return "That's a wrap — and you absolute CRUSHED it today. Seriously, every set, every rep — you were dialed in. Go get your protein in, hydrate, and let that body recover. I'm proud of you.";
        default:
            return "Keep going. You're doing great. Stay locked in.";
    }
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = (await req.json()) as {
            context?: string;
            metrics?: Record<string, unknown>;
            details?: ExerciseContext;
        };
        const context = body.context ?? "default";
        const metrics = body.metrics;
        const details = body.details;

        const script = buildScript(context, metrics, details);

        const apiKey = process.env.OPENAI_API_KEY;

        // ── Real OpenAI TTS path ────────────────────────────────────────────────
        if (apiKey) {
            const timeout = withTimeout(12_000);
            const ttsRes = await fetch(`${OPENAI_URL}/audio/speech`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: "tts-1",
                    // nova — warm, clear, confident female voice. Great for coaching.
                    // Alternatives: shimmer (softer/breathier), alloy (neutral)
                    voice: "nova",
                    input: script,
                    speed: 1.0,
                }),
                signal: timeout.signal,
            });
            timeout.done();

            if (!ttsRes.ok) {
                const errText = await ttsRes.text().catch(() => "");
                console.error("openai_tts_error", { status: ttsRes.status, body: errText.slice(0, 200) });
                // Fall through to script-only fallback
            } else {
                const audioBuffer = await ttsRes.arrayBuffer();
                return new NextResponse(audioBuffer, {
                    status: 200,
                    headers: {
                        "Content-Type": "audio/mpeg",
                        "Cache-Control": "no-store",
                    },
                });
            }
        }

        // ── Fallback: return script text so client uses browser SpeechSynthesis ─
        return NextResponse.json({ success: true, script });

    } catch (error) {
        console.error("coach_audio_error", error);
        return NextResponse.json({ error: "Failed to generate audio" }, { status: 500 });
    }
}
