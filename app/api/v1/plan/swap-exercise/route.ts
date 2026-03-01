import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { consumeToken } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";

type SwapRequest = {
  currentExercise?: string;
  reason?: string;
  location?: "gym" | "home";
  sets?: number;
  reps?: string;
  intensity?: string;
};

type Replacement = {
  name: string;
  sets: number;
  reps: string;
  intensity: string;
  notes: string;
};

const RATE_LIMIT_CAPACITY = 20;
const RATE_LIMIT_REFILL_PER_SECOND = 20 / 60;

function chooseReplacement({ currentExercise, reason, location, sets, reps, intensity }: Required<Pick<SwapRequest, "currentExercise">> & SwapRequest): Replacement {
  const lower = currentExercise.toLowerCase();
  const why = (reason ?? "").toLowerCase();
  const gym = location === "gym";
  const targetSets = Math.max(1, Math.min(8, Number.isFinite(sets) ? Math.round(sets as number) : 3));

  const withDefaults = (name: string, note: string): Replacement => ({
    name,
    sets: targetSets,
    reps: reps?.trim() || "8-12",
    intensity: intensity?.trim() || "RPE 6-7",
    notes: note,
  });

  if (why.includes("pain") || why.includes("injury") || why.includes("sore")) {
    if (/squat|lunge|leg press/.test(lower)) {
      return withDefaults("Box Squat", "Use pain-free depth and slow tempo. Stop if symptoms worsen.");
    }
    if (/deadlift|rdl|hinge/.test(lower)) {
      return withDefaults("Hip Hinge Patterning", "Reduce load and keep neutral spine with controlled tempo.");
    }
    if (/press|push/.test(lower)) {
      return withDefaults("Incline Push-up", "Use incline to reduce joint load while maintaining pushing stimulus.");
    }
  }

  if (why.includes("equipment") || why.includes("home") || location === "home") {
    if (/squat/.test(lower)) return withDefaults("Goblet Squat", "Home-friendly substitute preserving squat pattern.");
    if (/bench|press/.test(lower)) return withDefaults("Dumbbell Floor Press", "Uses minimal equipment and keeps pressing focus.");
    if (/row|pulldown/.test(lower)) return withDefaults("Single-arm Dumbbell Row", "Keeps pull volume with simple setup.");
    if (/deadlift|rdl/.test(lower)) return withDefaults("Dumbbell Romanian Deadlift", "Maintains hinge stimulus at home.");
    return withDefaults("Bodyweight Circuit", "Keeps session continuity when equipment is limited.");
  }

  if (/squat/.test(lower)) return withDefaults(gym ? "Front Squat" : "Goblet Squat", "Equivalent squat movement to maintain lower-body focus.");
  if (/bench|press|push/.test(lower)) return withDefaults(gym ? "Incline Dumbbell Press" : "Push-up", "Pressing variant to continue upper-body work.");
  if (/deadlift|rdl|hinge/.test(lower)) return withDefaults(gym ? "Romanian Deadlift" : "Dumbbell Romanian Deadlift", "Hinge alternative with manageable fatigue.");
  if (/row|pulldown|pull/.test(lower)) return withDefaults(gym ? "Seated Cable Row" : "Single-arm Dumbbell Row", "Pulling alternative to keep back stimulus.");

  return withDefaults("Tempo Bodyweight Variation", "Fallback substitution preserving training momentum.");
}

export async function POST(request: Request) {
  const requestId = makeRequestId();

  let body: SwapRequest;
  try {
    body = (await request.json()) as SwapRequest;
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid JSON body.");
  }

  const currentExercise = typeof body.currentExercise === "string" ? body.currentExercise.trim() : "";
  if (!currentExercise) {
    return jsonError(400, "VALIDATION_ERROR", "currentExercise is required.");
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
      `swap-exercise:${user.id}`,
      RATE_LIMIT_CAPACITY,
      RATE_LIMIT_REFILL_PER_SECOND
    );
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(limiter.retryAfterSeconds) } }
      );
    }

    const replacement = chooseReplacement({
      currentExercise,
      reason: body.reason,
      location: body.location,
      sets: body.sets,
      reps: body.reps,
      intensity: body.intensity,
    });

    return NextResponse.json({
      replacement,
      reliability: {
        confidence_score: 0.77,
        explanation: "Rule-based substitution using movement pattern and user reason.",
        limitations: [
          "No live pain signal is available; confirm pain-free range before loading.",
          "Adjust load downward if readiness is low today.",
        ],
      },
    });
  } catch (error) {
    console.error("swap_exercise_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Failed to generate substitution.");
  }
}
