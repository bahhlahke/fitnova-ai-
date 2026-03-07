/**
 * POST /api/v1/plan/adapt-day
 *
 * Takes the current day's planned exercises + a free-text user constraint
 * (e.g. "I'm at home today, only have dumbbells", "bad knee — avoid squats")
 * and returns a GPT-rewritten exercise list adapted to those constraints.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { consumeToken } from "@/lib/api/rate-limit";
import type { WeeklyPlanExercise } from "@/lib/plan/types";

export const dynamic = "force-dynamic";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const RATE_LIMIT_CAPACITY = 20;
const RATE_LIMIT_REFILL_PER_SECOND = 20 / 60;

type AdaptDayRequest = {
    userMessage: string;           // natural language constraint
    focus: string;                 // e.g. "Upper push (barbell-focused)"
    intensity: string;             // e.g. "high"
    target_duration_minutes: number;
    goals: string[];
    current_exercises: WeeklyPlanExercise[];
    date_local?: string;
};

type AdaptDayResponse = {
    exercises: WeeklyPlanExercise[];
    adaptation_note: string;
};

function withTimeout(ms: number) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    return { signal: controller.signal, done: () => clearTimeout(id) };
}

export async function POST(request: Request) {
    const requestId = makeRequestId();

    let body: AdaptDayRequest;
    try {
        body = (await request.json()) as AdaptDayRequest;
    } catch {
        return jsonError(400, "INVALID_JSON", "Invalid JSON body.");
    }

    if (!body.userMessage?.trim()) {
        return jsonError(400, "VALIDATION_ERROR", "userMessage is required.");
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return jsonError(503, "SERVICE_UNAVAILABLE", "AI service is not configured.");
    }

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
        }

        const limiter = consumeToken(
            `adapt-day:${user.id}`,
            RATE_LIMIT_CAPACITY,
            RATE_LIMIT_REFILL_PER_SECOND
        );
        if (!limiter.allowed) {
            return NextResponse.json(
                { error: "Too many requests", code: "RATE_LIMITED" },
                { status: 429, headers: { "Retry-After": String(limiter.retryAfterSeconds) } }
            );
        }

        // Build the current exercise list for the prompt
        const currentList = body.current_exercises
            .map((ex, i) => `${i + 1}. ${ex.name} | Equipment: ${ex.equipment} | ${ex.sets}×${ex.reps} | Cue: "${ex.coaching_cue}"`)
            .join("\n");

        const systemPrompt = `You are an elite personal trainer and exercise scientist. A user needs their planned workout modified based on a constraint they've described. You must replace or swap exercises intelligently, maintaining the training focus and intensity where possible.

Rules:
- ALWAYS return a valid JSON array of exercises in exactly this shape:
  [{ "name": string, "equipment": string, "sets": number, "reps": string, "coaching_cue": string }, ...]
- Respect the user's constraint above all else (e.g. if they say "no barbell", remove ALL barbell exercises)
- Maintain the session focus: "${body.focus}" at "${body.intensity}" intensity for ~${body.target_duration_minutes} minutes
- Keep similar total volume (number of exercises), sets, and reps
- Provide professional coaching cues — specific, movement-focused, not generic
- Vary equipment within the session — don't use the same piece for every exercise
- Return ONLY the JSON array, no markdown fences, no explanation text`;

        const userContent = `User's goals: ${body.goals.join(", ") || "general fitness"}

Current planned exercises:
${currentList}

User's constraint / request:
"${body.userMessage.trim()}"

Please return the adapted exercise list as a JSON array now.`;

        const timeout = withTimeout(15_000);
        const res = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "openai/gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userContent },
                ],
                max_tokens: 1200,
                temperature: 0.3,
            }),
            signal: timeout.signal,
        });
        timeout.done();

        if (!res.ok) {
            console.error("adapt_day_openrouter_error", { requestId, status: res.status });
            return jsonError(502, "UPSTREAM_ERROR", "AI provider error.");
        }

        const aiData = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const raw = (aiData.choices?.[0]?.message?.content ?? "").trim();

        let exercises: WeeklyPlanExercise[];
        try {
            // Strip any accidental markdown fences
            const clean = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
            exercises = JSON.parse(clean) as WeeklyPlanExercise[];
            if (!Array.isArray(exercises)) throw new Error("Not an array");
        } catch {
            console.error("adapt_day_parse_error", { requestId, raw: raw.slice(0, 200) });
            return jsonError(502, "INTERNAL_ERROR", "AI returned an unexpected format.");
        }

        // Build a concise note summarising what changed
        const removedEquip = body.current_exercises
            .map((e) => e.equipment)
            .filter((eq) => !exercises.some((e) => e.equipment === eq));
        const addedEquip = exercises
            .map((e) => e.equipment)
            .filter((eq) => !body.current_exercises.some((e) => e.equipment === eq));

        const noteParts: string[] = [];
        if (removedEquip.length) noteParts.push(`Removed: ${Array.from(new Set(removedEquip)).join(", ")}`);
        if (addedEquip.length) noteParts.push(`Added: ${Array.from(new Set(addedEquip)).join(", ")}`);
        const adaptation_note = noteParts.length
            ? `Adapted to your constraint. ${noteParts.join(". ")}.`
            : "Workout adapted to your constraint.";

        const response: AdaptDayResponse = { exercises, adaptation_note };

        // Save to daily_plans if date_local provided so the Guided Workout picks it up
        if (body.date_local) {
            const plan_json = {
                training_plan: {
                    focus: body.focus,
                    intensity: body.intensity,
                    target_duration_minutes: body.target_duration_minutes,
                    exercises: exercises,
                }
            };
            const upsertRes = await supabase.from("daily_plans").upsert(
                {
                    user_id: user.id,
                    date_local: body.date_local,
                    plan_json: plan_json,
                },
                { onConflict: "user_id,date_local" }
            );
            if (upsertRes.error) {
                console.error("adapt_day_save_error", { requestId, message: upsertRes.error.message });
            }
        }

        return NextResponse.json(response);

    } catch (error) {
        console.error("adapt_day_unhandled", {
            requestId,
            error: error instanceof Error ? error.message : "unknown",
        });
        return jsonError(500, "INTERNAL_ERROR", "Failed to adapt workout.");
    }
}
