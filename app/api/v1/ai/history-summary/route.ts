import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { consumeToken } from "@/lib/api/rate-limit";
import { toLocalDateString } from "@/lib/date/local-date";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const RATE_LIMIT_CAPACITY = 20;
const RATE_LIMIT_REFILL_PER_SECOND = 20 / 60;

function withTimeout(ms: number) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ms);
    return { signal: controller.signal, done: () => clearTimeout(timeout) };
}

export async function POST(req: Request) {
    const requestId = makeRequestId();
    const body = await req.json().catch(() => ({}));
    const localDate = body.localDate || toLocalDateString();
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        return jsonError(503, "SERVICE_UNAVAILABLE", "AI service is not configured.");
    }

    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
        }

        const limiter = consumeToken(
            `history-summary:${user.id}`,
            RATE_LIMIT_CAPACITY,
            RATE_LIMIT_REFILL_PER_SECOND
        );
        if (!limiter.allowed) {
            return NextResponse.json(
                { error: "Too many requests", code: "RATE_LIMITED" },
                { status: 429, headers: { "Retry-After": String(limiter.retryAfterSeconds) } }
            );
        }

        const [workoutsRes, nutritionRes, prsRes] = await Promise.all([
            supabase
                .from("workout_logs")
                .select("date, workout_type, exercises, duration_minutes")
                .eq("user_id", user.id)
                .order("date", { ascending: false })
                .limit(20),
            supabase
                .from("nutrition_logs")
                .select("date, total_calories, hydration_liters")
                .eq("user_id", user.id)
                .order("date", { ascending: false })
                .limit(20),
            supabase
                .from("exercise_prs")
                .select("exercise_name, highest_1rm, max_weight")
                .eq("user_id", user.id)
                .limit(10),
        ]);

        const workouts = (workoutsRes.data ?? []) as any[];
        const nutrition = (nutritionRes.data ?? []) as any[];
        const prs = (prsRes.data ?? []) as any[];

        const systemPrompt = `You are a PhD-level Clinical Sports Scientist. Your role is to provide a "Macro Evolutionary Summary" of the user's progress based on their historical data.
    
Focus on:
- Physiological Adaptation: How is the user adapting to training volume?
- Mechanical Overload: Are PRs correlating with increased session frequency?
- Metabolic Efficiency: Correlation between hydration/calories and session duration.

Instructions:
- Write 3-4 concise, high-impact sentences.
- Use an elitist but supportive tone.
- Reference specific data points where possible (e.g., "Your peak mechanical output in the ${prs[0]?.exercise_name ?? "main lifts"} has stabilized despite lower metabolic intake").
- Output ONLY the summary. No greetings.`;

        const dataBlock = [
            "Workouts (Last 20 sessions): " + workouts.map(w => `${w.date}:${w.workout_type}(${w.duration_minutes}m)`).join("; "),
            "Nutrition (Last 20 days): " + nutrition.map(n => `${n.date}:${n.total_calories}cal, ${n.hydration_liters}L`).join("; "),
            "Historic PRs: " + prs.map(p => `${p.exercise_name}: 1RM ${Math.round(p.highest_1rm)}kg`).join("; "),
        ].join("\n");

        const payload = {
            model: "openai/gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Data:\n${dataBlock}\n\nWrite the Evolutionary History Summary now:` },
            ],
            max_tokens: 400,
            temperature: 0.7,
        };

        const timeout = withTimeout(15_000);
        const res = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
            signal: timeout.signal,
        });
        timeout.done();

        if (!res.ok) {
            console.error("history_summary_openrouter_error", { requestId, status: res.status });
            return jsonError(502, "UPSTREAM_ERROR", "AI provider request failed.");
        }

        const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const summary = (data.choices?.[0]?.message?.content ?? "").trim() || null;

        return NextResponse.json({ summary });
    } catch (error) {
        console.error("history_summary_unhandled", {
            requestId,
            error: error instanceof Error ? error.message : "unknown",
        });
        return jsonError(500, "INTERNAL_ERROR", "AI service error.");
    }
}
