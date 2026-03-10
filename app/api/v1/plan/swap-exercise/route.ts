import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { consumeToken } from "@/lib/api/rate-limit";
import { enrichExercise } from "@/lib/workout/enrich-exercises";
import { ensureSitArtifacts, loadPhysicalHistoryEvents, persistPhysicalHistoryEvent } from "@/lib/sit/persistence";
import { detectSymptomIntent, selectDeterministicSubstitution } from "@/lib/sit/substitutions";
import { insertProductEvent } from "@/lib/telemetry/events";

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
  tempo: string;
  breathing: string;
  intent: string;
  rationale: string;
  video_url?: string | null;
  image_url?: string | null;
};

const RATE_LIMIT_CAPACITY = 20;
const RATE_LIMIT_REFILL_PER_SECOND = 20 / 60;

function chooseReplacement({ currentExercise, reason, location, sets, reps, intensity }: Required<Pick<SwapRequest, "currentExercise">> & SwapRequest): Replacement {
  const lower = currentExercise.toLowerCase();
  const why = (reason ?? "").toLowerCase();
  const gym = location === "gym";
  const targetSets = Math.max(1, Math.min(8, Number.isFinite(sets) ? Math.round(sets as number) : 3));

  const withDefaults = (name: string, note: string): Replacement => {
    const enriched = enrichExercise(name);
    return {
      name,
      sets: targetSets,
      reps: reps?.trim() || "8-12",
      intensity: intensity?.trim() || "RPE 6-7",
      notes: note,
      ...enriched
    } as Replacement;
  };

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

    const fallbackReplacement = chooseReplacement({
      currentExercise,
      reason: body.reason,
      location: body.location,
      sets: body.sets,
      reps: body.reps,
      intensity: body.intensity,
    });

    let replacement = fallbackReplacement;
    let confidence = 0.77;
    let explanation = "Rule-based substitution using movement pattern and user reason.";
    let policyDetails:
      | {
          policy_version: string;
          symptom_tags: string[];
          contraindications: string[];
          reused_history: boolean;
        }
      | undefined;

    await ensureSitArtifacts(supabase);
    const symptomIntent = detectSymptomIntent(body.reason ?? "");
    if (symptomIntent.triggered) {
      const history = await loadPhysicalHistoryEvents(supabase, user.id, symptomIntent.symptom_tags);
      const deterministic = selectDeterministicSubstitution({
        currentExercise,
        reason: body.reason ?? "",
        location: body.location,
        sets: body.sets,
        reps: body.reps,
        intensity: body.intensity,
        history,
      });

      replacement = deterministic.replacement as Replacement;
      confidence = deterministic.reused_history ? 0.96 : 0.92;
      explanation = deterministic.rationale;
      policyDetails = {
        policy_version: deterministic.policy_version,
        symptom_tags: deterministic.symptom_tags,
        contraindications: deterministic.contraindications,
        reused_history: deterministic.reused_history,
      };

      await persistPhysicalHistoryEvent(supabase, user.id, {
        event_type: "substitution_recommended",
        symptom_tags: deterministic.symptom_tags,
        current_exercise: currentExercise,
        replacement_exercise: deterministic.replacement.name,
        metadata: {
          reason: body.reason ?? "",
          policy_version: deterministic.policy_version,
          contraindications: deterministic.contraindications,
        },
      });
      await insertProductEvent(supabase, user.id, "substitution_policy_triggered", {
        current_exercise: currentExercise,
        replacement_exercise: deterministic.replacement.name,
        symptom_tags: deterministic.symptom_tags,
        policy_version: deterministic.policy_version,
      });
    }

    // Try OpenRouter AI for a smarter swap
    if (!policyDetails && process.env.OPENROUTER_API_KEY) {
      try {
        const prompt = `You are an elite strength and conditioning coach.
The user is currently scheduled to perform:
- Exercise: ${currentExercise}
- Sets: ${body.sets || 3}
- Reps: ${body.reps || "8-12"}
- Intensity: ${body.intensity || "RPE 7"}

They requested a substitution with the following reason: "${body.reason || "I need a change."}".

Provide a smart alternative exercise that respects their limitations or equipment constraints, while maintaining the intended stimulus as much as possible.

Return ONLY a valid JSON object with this exact structure (no markdown formatting, no backticks, just raw JSON):
{
  "name": "Exercise Name",
  "sets": ${body.sets || 3},
  "reps": "X-Y",
  "intensity": "RPE Z",
  "notes": "Brief coaching note focused on their reason for swapping",
  "tempo": "e.g. 3-1-1-1",
  "breathing": "e.g. Inhale down, exhale up",
  "intent": "What they should feel",
  "rationale": "Why this is a good substitute given their reason",
  "confidence_score": 0.95
}`;

        const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://koda.ai",
            "X-Title": "Koda AI"
          },
          body: JSON.stringify({
            model: "anthropic/claude-3-haiku",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          let contentStr = aiData.choices?.[0]?.message?.content;
          if (contentStr) {
            // Remove markdown code blocks if the model ignored instructions
            contentStr = contentStr.replace(/```json/g, '').replace(/```/g, '').trim();
            const aiSwap = JSON.parse(contentStr);
            if (aiSwap.name) {
              const enriched = enrichExercise(aiSwap.name);
              replacement = {
                name: aiSwap.name,
                sets: aiSwap.sets || fallbackReplacement.sets,
                reps: aiSwap.reps || fallbackReplacement.reps,
                intensity: aiSwap.intensity || fallbackReplacement.intensity,
                notes: aiSwap.notes || fallbackReplacement.notes,
                ...enriched
              } as Replacement;
              confidence = aiSwap.confidence_score || 0.85;
              explanation = aiSwap.rationale || "AI-powered contextual substitution.";
            }
          }
        }
      } catch (err) {
        console.warn("AI Swap failed, falling back to rule-based", err);
      }
    }

    return NextResponse.json({
      replacement,
      reliability: {
        confidence_score: confidence,
        explanation,
        limitations: [
          "No live pain signal is available; confirm pain-free range before loading.",
          "Adjust load downward if readiness is low today.",
        ],
      },
      policy: policyDetails,
    });
  } catch (error) {
    console.error("swap_exercise_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Failed to generate substitution.");
  }
}
