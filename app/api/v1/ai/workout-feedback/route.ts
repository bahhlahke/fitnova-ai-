import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { normalizeGuidedExercise } from "@/lib/workout/guided-session";

export const dynamic = "force-dynamic";

type WorkoutFeedbackContext = {
    set?: number;
    totalSets?: number;
    intensity?: string;
    reps?: string;
    tempo?: string;
    breathing?: string;
    intent?: string;
    rationale?: string;
    walkthrough_steps?: string[];
    coaching_points?: string[];
    setup_checklist?: string[];
    common_mistakes?: string[];
    rest_seconds_after_set?: number | null;
};

export async function POST(request: Request) {
    const requestId = makeRequestId();
    try {
        const { question, exercise, context } = await request.json() as {
            question?: string;
            exercise?: string;
            context?: WorkoutFeedbackContext;
        };
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
        }

        let reply = "";
        const q = (question || "").toLowerCase();
        const enriched = normalizeGuidedExercise({
            name: exercise || "Movement",
            sets: context?.totalSets || 3,
            reps: context?.reps || "8-10",
            intensity: context?.intensity || "RPE 7",
            tempo: context?.tempo,
            breathing: context?.breathing,
            intent: context?.intent,
            rationale: context?.rationale,
            walkthrough_steps: context?.walkthrough_steps,
            coaching_points: context?.coaching_points,
            setup_checklist: context?.setup_checklist,
            common_mistakes: context?.common_mistakes,
            rest_seconds_after_set: context?.rest_seconds_after_set,
        });
        const setLabel = context?.set && context?.totalSets
            ? `set ${context.set} of ${context.totalSets}`
            : "this set";
        const walkthrough = enriched.walkthrough_steps ?? [];
        const setup = enriched.setup_checklist ?? [];
        const mistakes = enriched.common_mistakes ?? [];
        const coachingPoints = enriched.coaching_points ?? [];

        if (q.includes("form") || q.includes("how to")) {
            reply = [
                `${enriched.name}, ${setLabel}:`,
                `1. Set up: ${setup[0] ?? "Lock in your stance and get stable before the first rep."}`,
                `2. Execute: ${walkthrough[1] ?? walkthrough[0] ?? "Move with control and keep your pattern clean all the way through the set."}`,
                `3. Finish: ${walkthrough[2] ?? enriched.breathing ?? "Reset your breath and own the finish position before the next rep."}`,
                `Coach's eye: avoid ${mistakes[0] ?? "rushing the hardest part of the rep"}.`,
            ].join(" ");
        } else if (q.includes("pain") || q.includes("hurt")) {
            reply = [
                `If the discomfort is sharp, radiating, or changes your movement, stop ${enriched.name} right now.`,
                `If it feels more like strain than pain, reduce load by 10 to 15 percent, slow the tempo to ${enriched.tempo ?? "a controlled cadence"}, and stay inside a pain-free range.`,
                `If it still does not feel right, swap the movement instead of grinding through it.`,
            ].join(" ");
        } else if (q.includes("heavy") || q.includes("weight")) {
            reply = [
                `For ${enriched.name}, keep load tied to execution quality.`,
                `If you hit the top of the rep target with one to two clean reps left in reserve, add a small jump next set.`,
                `If rep speed slowed hard or you lost the positions in ${coachingPoints[0] ?? enriched.intent ?? "your setup"}, keep the weight and make the set cleaner first.`,
            ].join(" ");
        } else if (q.includes("science") || q.includes("why")) {
            reply = [
                `${enriched.name} is in your plan because ${enriched.rationale ?? "it builds the exact quality we want from this session"}.`,
                `The coaching focus is ${enriched.intent ?? "staying organized through the full range of motion"}.`,
                `That is why the plan pairs ${enriched.reps} at ${enriched.intensity} instead of just asking you to move heavier weight.`,
            ].join(" ");
        } else {
            reply = [
                `You're in ${setLabel} on ${enriched.name}.`,
                `Stay with ${coachingPoints[0] ?? enriched.intent ?? "clean, repeatable movement quality"}.`,
                `After the set, take about ${enriched.rest_seconds_after_set ?? 60} seconds, then attack the next effort with the same positions.`,
            ].join(" ");
        }

        return NextResponse.json({ reply, requestId });
    } catch (error) {
        console.error("workout_feedback_error", { requestId, error });
        return jsonError(500, "INTERNAL_ERROR", "Failed to get coaching feedback.");
    }
}
