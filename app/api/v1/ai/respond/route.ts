/**
 * POST /api/v1/ai/respond — AI coach chat.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assembleContext } from "@/lib/ai/assemble-context";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { consumeToken } from "@/lib/api/rate-limit";
import { callModel } from "@/lib/ai/model";
import {
  ensureSitArtifacts,
  loadPhysicalHistoryEvents,
  persistPhysicalHistoryEvent,
} from "@/lib/sit/persistence";
import {
  detectSymptomIntent,
  getExerciseOntologySeed,
  selectDeterministicSubstitution,
} from "@/lib/sit/substitutions";
import { insertProductEvent } from "@/lib/telemetry/events";
import { normalizeGuidedExercise } from "@/lib/workout/guided-session";
import type { AiActionResult, RefreshScope } from "@/types";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT_VERSION = "v2-balanced-safety";
const MAX_MESSAGE_CHARS = 2000;
const RATE_LIMIT_CAPACITY = 12;
const RATE_LIMIT_REFILL_PER_SECOND = 12 / 60;

const SAFETY_POLICY = `Safety policy (balanced):
- Provide educational fitness and nutrition coaching only.
- Do not diagnose, treat, or claim to replace licensed medical professionals.
- For severe pain, chest pain, dizziness, or concerning symptoms, tell the user to stop and seek medical care.
- Respect injuries/limitations from profile data and provide safer alternatives.
- Prefer sustainable, evidence-informed advice over extreme protocols.`;

type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

type RequestBody = {
  message?: string;
  localDate?: string;
  /** Optional prior conversation turns for multi-turn continuity (iOS persistent chat). */
  conversationHistory?: ConversationTurn[];
};

function isValidLocalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function resolveLogDate(localDate: string | undefined): string | null {
  if (typeof localDate === "string") {
    const trimmed = localDate.trim();
    if (isValidLocalDate(trimmed)) return trimmed;
  }
  return null;
}

function toKgFromLbs(lbs: number): number {
  return Math.round(lbs * 0.45359237 * 10) / 10;
}

function detectExerciseMention(
  message: string,
  plannedExercises: Array<{ name?: string }>
): string | null {
  const lower = message.toLowerCase();
  const fromPlan = plannedExercises.find((exercise) => exercise.name && lower.includes(exercise.name.toLowerCase()));
  if (fromPlan?.name) return fromPlan.name;
  const ontologyMatch = getExerciseOntologySeed().find((entry) =>
    entry.aliases.some((alias) => lower.includes(alias))
  );
  return ontologyMatch?.canonical_name ?? null;
}

type GuidedExercise = ReturnType<typeof normalizeGuidedExercise>;

type WorkoutParityDiff = {
  exercise_index: number;
  exercise_name: string;
  changed_fields: string[];
  baseline_summary: string;
  candidate_summary: string;
};

type WorkoutParityGuardPayload = {
  requires_approval: boolean;
  summary: string;
  divergence_count: number;
  diffs: WorkoutParityDiff[];
};

const PARITY_FIELDS: Array<
  "name" | "sets" | "reps" | "intensity" | "target_rir" | "target_load_kg" | "rest_seconds_after_set" | "progression_note"
> = [
  "name",
  "sets",
  "reps",
  "intensity",
  "target_rir",
  "target_load_kg",
  "rest_seconds_after_set",
  "progression_note",
];

function normalizeToolExercise(exercise: any): GuidedExercise {
  return normalizeGuidedExercise({
    name: typeof exercise?.name === "string" ? exercise.name : "Exercise",
    sets: Number(exercise?.sets) || 1,
    reps: typeof exercise?.reps === "string" ? exercise.reps : String(exercise?.reps ?? "8-10"),
    intensity: typeof exercise?.intensity === "string" ? exercise.intensity : "RPE 7",
    notes: typeof exercise?.notes === "string" ? exercise.notes : undefined,
    tempo: typeof exercise?.tempo === "string" ? exercise.tempo : undefined,
    breathing: typeof exercise?.breathing === "string" ? exercise.breathing : undefined,
    intent: typeof exercise?.intent === "string" ? exercise.intent : undefined,
    rationale: typeof exercise?.rationale === "string" ? exercise.rationale : undefined,
    walkthrough_steps: Array.isArray(exercise?.walkthrough_steps) ? exercise.walkthrough_steps : undefined,
    coaching_points: Array.isArray(exercise?.coaching_points) ? exercise.coaching_points : undefined,
    setup_checklist: Array.isArray(exercise?.setup_checklist) ? exercise.setup_checklist : undefined,
    common_mistakes: Array.isArray(exercise?.common_mistakes) ? exercise.common_mistakes : undefined,
    target_load_kg: Number.isFinite(Number(exercise?.target_load_kg)) ? Number(exercise.target_load_kg) : undefined,
    target_rir: Number.isFinite(Number(exercise?.target_rir)) ? Number(exercise.target_rir) : undefined,
    rest_seconds_after_set:
      Number.isFinite(Number(exercise?.rest_seconds_after_set)) ? Number(exercise.rest_seconds_after_set) : undefined,
    progression_note: typeof exercise?.progression_note === "string" ? exercise.progression_note : undefined,
  });
}

function extractDurationSeconds(text: string | undefined): number | null {
  if (!text) return null;
  const match = text.toLowerCase().match(/(\d{1,3})\s*(sec|secs|second|seconds|s|min|mins|minute|minutes|m)\b/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  const unit = match[2];
  const seconds = unit.startsWith("m") ? value * 60 : value;
  return Math.max(5, Math.min(seconds, 600));
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function equalParityField(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return a === b;
}

function summarizeExercise(exercise: GuidedExercise | undefined): string {
  if (!exercise) return "No baseline";
  const rest = typeof exercise.rest_seconds_after_set === "number" ? `${exercise.rest_seconds_after_set}s rest` : "auto rest";
  return `${exercise.name} · ${exercise.sets}x${exercise.reps} · ${exercise.intensity} · ${rest}`;
}

function clampGuidedExerciseForParity(candidate: GuidedExercise, baseline: GuidedExercise | undefined): GuidedExercise {
  const next: GuidedExercise = {
    ...candidate,
    walkthrough_steps: (candidate.walkthrough_steps ?? []).slice(0, 5),
    coaching_points: (candidate.coaching_points ?? []).slice(0, 4),
    setup_checklist: (candidate.setup_checklist ?? []).slice(0, 5),
    common_mistakes: (candidate.common_mistakes ?? []).slice(0, 3),
  };

  if (!baseline) {
    next.rest_seconds_after_set = clampNumber(
      Number(next.rest_seconds_after_set ?? 60),
      20,
      180
    );
    return next;
  }

  const baselineSets = Number(baseline.sets) || 1;
  next.sets = clampNumber(Number(next.sets) || baselineSets, Math.max(1, baselineSets - 1), baselineSets + 1);

  const baselineTimed = extractDurationSeconds(baseline.reps ?? "") != null;
  const candidateTimed = extractDurationSeconds(next.reps ?? "") != null;
  if (baselineTimed !== candidateTimed) {
    next.reps = baseline.reps;
  }

  if (typeof baseline.target_rir === "number") {
    const candidateRir = typeof next.target_rir === "number" ? next.target_rir : baseline.target_rir;
    next.target_rir = clampNumber(candidateRir, Math.max(0, baseline.target_rir - 2), baseline.target_rir + 2);
  }

  if (typeof baseline.target_load_kg === "number" && baseline.target_load_kg > 0) {
    const candidateLoad =
      typeof next.target_load_kg === "number" && next.target_load_kg > 0
        ? next.target_load_kg
        : baseline.target_load_kg;
    const maxSafeLoad = baseline.target_load_kg * 1.12;
    next.target_load_kg = Number(clampNumber(candidateLoad, 0, maxSafeLoad).toFixed(1));
  }

  const baselineRest =
    typeof baseline.rest_seconds_after_set === "number" && baseline.rest_seconds_after_set > 0
      ? baseline.rest_seconds_after_set
      : 60;
  next.rest_seconds_after_set = clampNumber(
    Number(next.rest_seconds_after_set ?? baselineRest),
    Math.max(20, Math.floor(baselineRest * 0.5)),
    Math.min(180, Math.ceil(baselineRest * 1.5))
  );

  if (!next.progression_note && baseline.progression_note) {
    next.progression_note = baseline.progression_note;
  }

  return next;
}

function buildWorkoutParityGuard(
  baselineRawExercises: unknown,
  candidateExercises: GuidedExercise[]
): { exercises: GuidedExercise[]; parityGuard: WorkoutParityGuardPayload } {
  const baselineExercises: GuidedExercise[] = Array.isArray(baselineRawExercises)
    ? baselineRawExercises.map((exercise) => normalizeToolExercise(exercise))
    : [];

  const protectedExercises = candidateExercises.map((exercise, index) =>
    clampGuidedExerciseForParity(exercise, baselineExercises[index])
  );

  const diffs: WorkoutParityDiff[] = [];
  protectedExercises.forEach((exercise, index) => {
    const baseline = baselineExercises[index];
    if (!baseline) return;
    const changed = PARITY_FIELDS.filter((field) => !equalParityField(baseline[field], exercise[field]));
    if (changed.length > 0) {
      diffs.push({
        exercise_index: index,
        exercise_name: exercise.name ?? `Exercise ${index + 1}`,
        changed_fields: changed,
        baseline_summary: summarizeExercise(baseline),
        candidate_summary: summarizeExercise(exercise),
      });
    }
  });

  if (baselineExercises.length > 0 && baselineExercises.length !== protectedExercises.length) {
    diffs.push({
      exercise_index: -1,
      exercise_name: "Session structure",
      changed_fields: ["exercise_count"],
      baseline_summary: `${baselineExercises.length} planned movements`,
      candidate_summary: `${protectedExercises.length} planned movements`,
    });
  }

  const divergenceCount = diffs.reduce((total, diff) => total + diff.changed_fields.length, 0);
  const requiresApproval = divergenceCount > 0;
  const summary = requiresApproval
    ? `Plan diverges from Koda baseline on ${divergenceCount} guarded fields. Review and approve before launch.`
    : "Plan is aligned with Koda baseline constraints and progression guardrails.";

  return {
    exercises: protectedExercises,
    parityGuard: {
      requires_approval: requiresApproval,
      summary,
      divergence_count: divergenceCount,
      diffs,
    },
  };
}

function clampDurationMinutes(requestedDuration: unknown, baselineDuration: unknown): number {
  const requested = Number(requestedDuration);
  const baseline = Number(baselineDuration);
  const fallback = Number.isFinite(requested) ? requested : Number.isFinite(baseline) ? baseline : 45;
  if (!Number.isFinite(baseline) || baseline <= 0) {
    return clampNumber(Math.round(fallback), 20, 90);
  }
  const min = Math.max(20, Math.round(baseline - 15));
  const max = Math.min(90, Math.round(baseline + 15));
  return clampNumber(Math.round(fallback), min, max);
}

export async function POST(request: Request) {
  const requestId = makeRequestId();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return jsonError(
      503,
      "SERVICE_UNAVAILABLE",
      "AI service is not configured."
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid JSON body.");
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const logDate = resolveLogDate(body.localDate) || new Date().toISOString().slice(0, 10);
  // Sanitise and cap conversation history to last 10 turns
  const conversationHistory: ConversationTurn[] = Array.isArray(body.conversationHistory)
    ? body.conversationHistory
      .filter((t) => (t.role === "user" || t.role === "assistant") && typeof t.content === "string")
      .map((t) => ({ role: t.role, content: t.content.slice(0, MAX_MESSAGE_CHARS) }))
      .slice(-10)
    : [];
  if (!message) {
    return jsonError(400, "VALIDATION_ERROR", "message is required.");
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      `message must be <= ${MAX_MESSAGE_CHARS} characters.`
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const allowAnonymousInDev = process.env.ALLOW_DEV_ANON_AI === "true";
    if (!user && !allowAnonymousInDev) {
      return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
    }

    const userId = user?.id ?? "anonymous";
    const limiter = consumeToken(
      `ai:${userId}`,
      RATE_LIMIT_CAPACITY,
      RATE_LIMIT_REFILL_PER_SECOND
    );
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMITED" },
        {
          status: 429,
          headers: { "Retry-After": String(limiter.retryAfterSeconds) },
        }
      );
    }

    if (user?.id) {
      const symptomIntent = detectSymptomIntent(message);
      if (symptomIntent.triggered) {
        await ensureSitArtifacts(supabase);
        const todayPlanRes = await supabase
          .from("daily_plans")
          .select("plan_json")
          .eq("user_id", user.id)
          .eq("date_local", logDate)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const currentPlanExercises =
          ((todayPlanRes.data?.plan_json as any)?.training_plan?.exercises as Array<{ name?: string }>) ?? [];
        const currentExercise = detectExerciseMention(message, currentPlanExercises) ?? currentPlanExercises[0]?.name;

        if (currentExercise) {
          const history = await loadPhysicalHistoryEvents(supabase, user.id, symptomIntent.symptom_tags);
          const deterministic = selectDeterministicSubstitution({
            currentExercise,
            reason: message,
            location: ((todayPlanRes.data?.plan_json as any)?.training_plan?.location_option ?? "gym") as
              | "gym"
              | "home",
            history,
          });

          await Promise.allSettled([
            persistPhysicalHistoryEvent(supabase, user.id, {
              event_type: "symptom_reported",
              symptom_tags: deterministic.symptom_tags,
              current_exercise: currentExercise,
              metadata: { source: "ai_respond", message },
            }),
            persistPhysicalHistoryEvent(supabase, user.id, {
              event_type: "substitution_recommended",
              symptom_tags: deterministic.symptom_tags,
              current_exercise: currentExercise,
              replacement_exercise: deterministic.replacement.name,
              metadata: {
                source: "ai_respond",
                policy_version: deterministic.policy_version,
                rationale: deterministic.rationale,
              },
            }),
            insertProductEvent(supabase, user.id, "substitution_policy_triggered", {
              source: "ai_respond",
              current_exercise: currentExercise,
              replacement_exercise: deterministic.replacement.name,
              symptom_tags: deterministic.symptom_tags,
              policy_version: deterministic.policy_version,
            }),
          ]);

          const deterministicReply = [
            `Pain/symptom trigger detected for ${currentExercise}.`,
            `Swap it for ${deterministic.replacement.name} at ${deterministic.replacement.sets} x ${deterministic.replacement.reps} around ${deterministic.replacement.intensity}.`,
            deterministic.rationale,
            "If pain is sharp, radiating, or worsening, stop and seek licensed medical care.",
          ].join(" ");

          return NextResponse.json({
            reply: deterministicReply,
            policy: {
              version: deterministic.policy_version,
              symptom_tags: deterministic.symptom_tags,
              replacement: deterministic.replacement,
            },
            refreshScopes: ["plan"],
          });
        }
      }
    }

    const BASE_CAPABILITIES = 
      "You have direct control over the application. You can:\n" +
      "- Log food (`log_meal`) and water (`log_hydration`).\n" +
      "- Log workouts (`log_workout`) with `calories_burned` for expenditure.\n" +
      "- Record daily check-ins (`log_daily_check_in`) regarding energy and sleep.\n" +
      "- Correct logs by removing meals (`remove_meal`).\n" +
      "- Update the user's calibration, goals, and limitations (`update_user_profile`).\n" +
      "- Share achievements to the activity feed (`create_social_post`).\n" +
      "- Create new personalized plans (`generate_daily_plan`) based on time/equipment.\n" +
      "- Navigate the user to a specific page context (`navigate_to`).\n" +
      "- Escalate complex medical or technical issues to a human coach (`request_coach_assistance`).\n\n";

    let systemPrompt =
      "You are an elite AI Performance Coach & Sports Scientist with a PhD in Exercise Physiology. Respond with the precision and authority of a world-class expert.\n\n" +
      BASE_CAPABILITIES +
      "Synthesis Logic: Analyze the user's longitudinal data (HRV, PRs, Sleep) to provide high-performance insights typically reserved for Olympic teams. Always prefer taking action when the user reports data.\n" +
      "Workout Generation Logic: When the user asks you to build, regenerate, or personalize a workout for today, prefer `update_workout_plan` or `generate_daily_plan` so the result is immediately usable inside the guided workout flow. Premium guided workouts should include precise sets, reps, intensity, rest guidance, walkthrough steps, setup checklist items, coaching points, common mistakes, and progression notes whenever useful.\n\n" +
      "Date Resolution: The user may refer to relative dates (e.g. 'yesterday', 'this past Saturday', 'last Monday'). Always calculate the absolute YYYY-MM-DD based on the 'Current Context' provided in your system prompt and pass it to the logging tools. End with a concrete next step.";

    if (user?.id) {
      try {
        const { systemPrompt: assembled } = await assembleContext(supabase, user.id);
        systemPrompt = `${assembled}\n\n${BASE_CAPABILITIES}\n\n${SAFETY_POLICY}`;
      } catch {
        systemPrompt = `${systemPrompt}\n\n${SAFETY_POLICY}`;
      }
    } else {
      systemPrompt = `${systemPrompt}\n\n${SAFETY_POLICY}`;
    }

    const OMNI_TOOLS: any[] = [
      {
        type: "function",
        function: {
          name: "log_meal",
          description: "Logs a meal to the user's nutrition log today.",
          parameters: {
            type: "object",
            properties: {
              food_items: { type: "string", description: "Food items consumed, e.g. '3 eggs and toast'." },
              calories: { type: "number", description: "Estimated total calories." },
              protein: { type: "number", description: "Estimated protein in grams." },
              carbs: { type: "number", description: "Estimated carbs in grams." },
              fat: { type: "number", description: "Estimated fat in grams." },
              date: { type: "string", description: "The date of the meal in YYYY-MM-DD format. Required if the user mentions a past date." }
            },
            required: ["food_items", "calories", "protein", "carbs", "fat"],
          },
        }
      },
      {
        type: "function",
        function: {
          name: "log_workout",
          description: "Logs a completed workout session with optional calories burned.",
          parameters: {
            type: "object",
            properties: {
              workout_type: { type: "string", enum: ["strength", "cardio", "mobility", "other"], description: "Type of workout" },
              duration_minutes: { type: "number", description: "Duration in minutes" },
              calories_burned: { type: "number", description: "Estimated calories burned during exercise (separate from consumption)." },
              notes: { type: "string", description: "Summary of the workout" },
              date: { type: "string", description: "The date of the workout in YYYY-MM-DD format. Required if the user mentions a past date." }
            },
            required: ["workout_type", "duration_minutes"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "remove_meal",
          description: "Removes a specific meal from today's nutrition log based on description.",
          parameters: {
            type: "object",
            properties: {
              meal_description: { type: "string", description: "Partial or full description of the meal to remove, e.g. 'banana'." },
              date: { type: "string", description: "The date of the meal to remove in YYYY-MM-DD format. Default is today." }
            },
            required: ["meal_description"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "log_hydration",
          description: "Logs water or fluid intake in liters for today.",
          parameters: {
            type: "object",
            properties: {
              liters: { type: "number", description: "Amount of fluid in liters." },
              date: { type: "string", description: "The date of hydration in YYYY-MM-DD format. Default is today." }
            },
            required: ["liters"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "log_daily_check_in",
          description: "Records daily status: energy, sleep, soreness, and adherence.",
          parameters: {
            type: "object",
            properties: {
              energy_score: { type: "number", minimum: 1, maximum: 5, description: "Energy level 1-5." },
              sleep_hours: { type: "number", description: "Hours of sleep." },
              soreness_notes: { type: "string", description: "Any muscle soreness or physical discomfort." },
              adherence_score: { type: "number", minimum: 1, maximum: 5, description: "How well you stuck to your plan 1-5." }
            },
            required: ["energy_score", "sleep_hours"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_user_profile",
          description: "Updates user's personal profile and calibration data.",
          parameters: {
            type: "object",
            properties: {
              height_cm: { type: "number" },
              weight_kg: { type: "number" },
              activity_level: { type: "string", enum: ["sedentary", "light", "moderate", "active", "very_active"] },
              goals: { type: "array", items: { type: "string" } },
              injuries_limitations: { type: "object" },
              dietary_preferences: { type: "object" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_social_post",
          description: "Shares an update to the community activity feed.",
          parameters: {
            type: "object",
            properties: {
              content: { type: "string", description: "What you want to share." },
              type: { type: "string", enum: ["workout", "meal", "achievement", "pr"], default: "achievement" }
            },
            required: ["content", "type"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "request_coach_assistance",
          description: "Escalates the current topic to a human coach.",
          parameters: {
            type: "object",
            properties: {
              topic: { type: "string", description: "A short label for the request." },
              details: { type: "string", description: "Detailed explanation of why you need help." }
            },
            required: ["topic", "details"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "generate_daily_plan",
          description: "Triggers a new guided-workout-ready daily plan generation with optional constraints.",
          parameters: {
            type: "object",
            properties: {
              location: { type: "string", enum: ["gym", "home"] },
              minutesAvailable: { type: "number", minimum: 15, maximum: 180 }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "log_biometrics",
          description: "Logs body weight or body fat percentage progress.",
          parameters: {
            type: "object",
            properties: {
              weight_lbs: { type: "number", description: "Body weight in lbs" },
              body_fat_percent: { type: "number", description: "Body fat percentage" },
              date: { type: "string", description: "The date for these biometrics in YYYY-MM-DD format. Default is today." }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "navigate_to",
          description: "Navigates the user's screen to a specific sub-page. Use this if the user asks you to take them somewhere or open a specific view.",
          parameters: {
            type: "object",
            properties: {
              route: { type: "string", description: "The internal relative path to navigate to, e.g. '/log/workout/guided', '/progress', '/log/nutrition'." },
              reason: { type: "string", description: "A short label for why we are navigating." }
            },
            required: ["route", "reason"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "show_movement_demo",
          description: "Shows a 4K cinematic video demonstration of a specific exercise within the chat.",
          parameters: {
            type: "object",
            properties: {
              exercise_name: { type: "string", description: "Name of the exercise to demonstrate, e.g. 'Back Squat', 'Pigeon Stretch'." }
            },
            required: ["exercise_name"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_workout_plan",
          description: "Updates the user's current guided workout plan for today with coach-grade exercises, walkthroughs, setup checklists, coaching cues, load targets, and rest guidance. The guided coach reads these details live during the workout.",
          parameters: {
            type: "object",
            properties: {
              focus: { type: "string", description: "The high-level focus of the workout, e.g. 'CrossFit-Style Metabolic Conditioning'." },
              duration_minutes: { type: "number", description: "Estimated duration in minutes." },
              exercises: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    sets: { type: "number" },
                    reps: { type: "string" },
                    intensity: { type: "string" },
                    notes: { type: "string" },
                    tempo: { type: "string" },
                    breathing: { type: "string" },
                    intent: { type: "string" },
                    rationale: { type: "string" },
                    walkthrough_steps: { type: "array", items: { type: "string" } },
                    coaching_points: { type: "array", items: { type: "string" } },
                    setup_checklist: { type: "array", items: { type: "string" } },
                    common_mistakes: { type: "array", items: { type: "string" } },
                    target_load_kg: { type: "number" },
                    target_rir: { type: "number" },
                    rest_seconds_after_set: { type: "number" },
                    progression_note: { type: "string" }
                  },
                  required: ["name", "sets", "reps"]
                }
              }
            },
            required: ["focus", "exercises"]
          }
        }
      }
    ];

    const actions: AiActionResult[] = [];
    const refreshScopes = new Set<RefreshScope>();

    // Include prior conversation turns so the model has multi-turn context.
    // History is placed between system prompt and the current user message
    // (excludes the current turn, which is already appended below).
    const historyTurns: any[] = conversationHistory
      .filter((t) => t.content !== message) // avoid duplicating the current message
      .slice(-8) // cap to 8 prior turns for token budget
      .map((t) => ({ role: t.role, content: t.content }));

    let messagesForModel: any[] = [
      { role: "system", content: systemPrompt },
      ...historyTurns,
      { role: "user", content: message },
    ];

    const { reply } = await (async () => {
      try {
        const { content, tool_calls } = await callModel({
          messages: messagesForModel,
          tools: user?.id ? (OMNI_TOOLS as any) : undefined,
          tool_choice: user?.id ? "auto" : undefined,
        });

        if (tool_calls && tool_calls.length > 0) {
          messagesForModel.push({ role: "assistant", content, tool_calls });

          for (const tc of tool_calls) {
            let resultStr = "";
            try {
              const args = JSON.parse(tc.function.arguments);
              const targetDate = resolveLogDate(args.date) || logDate;
              
              if (tc.function.name === "log_meal") {
                const calories = Number(args.calories);
                const protein = Number(args.protein);
                const carbs = Number(args.carbs);
                const fat = Number(args.fat);
                if (
                  typeof args.food_items !== "string" ||
                  !Number.isFinite(calories) ||
                  !Number.isFinite(protein) ||
                  !Number.isFinite(carbs) ||
                  !Number.isFinite(fat)
                ) {
                  throw new Error("Meal payload is incomplete.");
                }

                const { data: existingLog, error: existingLogError } = await supabase
                  .from("nutrition_logs")
                  .select("log_id, meals, total_calories")
                  .eq("user_id", userId)
                  .eq("date", targetDate)
                  .maybeSingle();

                if (existingLogError) throw new Error(existingLogError.message);

                const newMeal = {
                  time: new Date().toTimeString().slice(0, 5),
                  description: args.food_items,
                  calories,
                  macros: { protein, carbs, fat } as any,
                };

                if (existingLog) {
                  const updatedMeals = [...(Array.isArray(existingLog.meals) ? existingLog.meals : []), newMeal];
                  const totalCals = updatedMeals.reduce((s: number, m: any) => s + (m.calories || 0), 0);
                  const { error: updateError } = await supabase
                    .from("nutrition_logs")
                    .update({ meals: updatedMeals, total_calories: totalCals })
                    .eq("log_id", existingLog.log_id);
                  if (updateError) throw new Error(updateError.message);
                } else {
                  const { error: insertError } = await supabase
                    .from("nutrition_logs")
                    .insert({
                      user_id: userId,
                      date: targetDate,
                      meals: [newMeal],
                      total_calories: calories,
                    });
                  if (insertError) throw new Error(insertError.message);
                }
                resultStr = `Successfully logged meal: ${args.food_items} (${Math.round(calories)} cals)`;
                actions.push({
                  type: "meal_logged",
                  targetRoute: "/log/nutrition",
                  summary: "Meal logged",
                });
                refreshScopes.add("dashboard");
                refreshScopes.add("nutrition");
              } else if (tc.function.name === "log_workout") {
                const workoutType =
                  typeof args.workout_type === "string"
                    ? args.workout_type
                    : "other";
                const durationMinutes = Number(args.duration_minutes);
                if (
                  !Number.isFinite(durationMinutes) ||
                  durationMinutes < 1 ||
                  durationMinutes > 600
                ) {
                  throw new Error("Workout duration must be 1-600 minutes.");
                }

                const { error: insertError } = await supabase.from("workout_logs").insert({
                  user_id: userId,
                  date: targetDate,
                  workout_type: workoutType,
                  duration_minutes: Math.round(durationMinutes),
                  calories_burned: Number.isFinite(args.calories_burned) ? Math.round(Number(args.calories_burned)) : null,
                  exercises: [],
                  notes: args.notes || "Logged via Koda AI"
                });
                if (insertError) throw new Error(insertError.message);
                const calStr = args.calories_burned ? ` (${Math.round(args.calories_burned)} kcal burned)` : "";
                resultStr = `Successfully logged workout: ${Math.round(durationMinutes)} min ${workoutType}${calStr}`;
                actions.push({
                  type: "workout_logged",
                  targetRoute: "/log/workout",
                  summary: "Workout logged",
                });
                refreshScopes.add("dashboard");
                refreshScopes.add("workout");
              } else if (tc.function.name === "remove_meal") {
                const mealDesc = (args.meal_description || "").toLowerCase();
                if (!mealDesc) throw new Error("meal_description is required.");

                const { data: log, error: logError } = await supabase
                  .from("nutrition_logs")
                  .select("log_id, meals")
                  .eq("user_id", userId)
                  .eq("date", targetDate)
                  .maybeSingle();

                if (logError) throw new Error(logError.message);
                if (!log || !Array.isArray(log.meals) || log.meals.length === 0) {
                  resultStr = "No meals found in today's log to remove.";
                } else {
                  const initialCount = log.meals.length;
                  const updatedMeals = log.meals.filter((m: any) =>
                    !String(m.description || "").toLowerCase().includes(mealDesc)
                  );

                  if (updatedMeals.length === initialCount) {
                    resultStr = `Could not find a meal matching "${args.meal_description}" in today's log.`;
                  } else {
                    const totalCals = updatedMeals.reduce((s: number, m: any) => s + (m.calories || 0), 0);
                    const { error: updateError } = await supabase
                      .from("nutrition_logs")
                      .update({ meals: updatedMeals, total_calories: totalCals })
                      .eq("log_id", log.log_id);

                    if (updateError) throw new Error(updateError.message);
                    resultStr = `Successfully removed meal(s) matching "${args.meal_description}".`;
                    actions.push({
                      type: "meal_removed",
                      targetRoute: "/log/nutrition",
                      summary: "Meal removed",
                    } as any);
                    refreshScopes.add("dashboard");
                    refreshScopes.add("nutrition");
                  }
                }
              } else if (tc.function.name === "log_hydration") {
                const liters = Number(args.liters);
                if (!Number.isFinite(liters)) throw new Error("Invalid liters.");

                const { data: existingLog, error: logError } = await supabase
                  .from("nutrition_logs")
                  .select("log_id, hydration_liters")
                  .eq("user_id", userId)
                  .eq("date", targetDate)
                  .maybeSingle();

                if (logError) throw new Error(logError.message);

                if (existingLog) {
                  const currentHydration = Number(existingLog.hydration_liters || 0);
                  const { error: updateError } = await supabase
                    .from("nutrition_logs")
                    .update({ hydration_liters: currentHydration + liters })
                    .eq("log_id", existingLog.log_id);
                  if (updateError) throw new Error(updateError.message);
                } else {
                  const { error: insertError } = await supabase.from("nutrition_logs").insert({
                    user_id: userId,
                    date: targetDate,
                    meals: [],
                    total_calories: 0,
                    hydration_liters: liters,
                  });
                  if (insertError) throw new Error(insertError.message);
                }
                resultStr = `Successfully logged ${liters}L of water.`;
                actions.push({ type: "hydration_logged", targetRoute: "/log/nutrition", summary: "Hydration logged" } as any);
                refreshScopes.add("dashboard");
                refreshScopes.add("nutrition");
              } else if (tc.function.name === "log_daily_check_in") {
                const { error: checkErr } = await supabase.from("check_ins").insert({
                  user_id: userId,
                  date_local: targetDate,
                  energy_score: args.energy_score,
                  sleep_hours: args.sleep_hours,
                  soreness_notes: args.soreness_notes,
                  adherence_score: args.adherence_score
                });
                if (checkErr) throw new Error(checkErr.message);
                resultStr = "Check-in recorded successfully.";
                actions.push({ type: "check_in_logged", targetRoute: "/dashboard", summary: "Daily check-in saved" } as any);
                refreshScopes.add("dashboard");
              } else if (tc.function.name === "update_user_profile") {
                const payload: any = {};
                if (args.height_cm) payload.height = args.height_cm;
                if (args.weight_kg) payload.weight = args.weight_kg;
                if (args.activity_level) payload.activity_level = args.activity_level;
                if (args.goals) payload.goals = args.goals;
                if (args.injuries_limitations) payload.injuries_limitations = args.injuries_limitations;
                if (args.dietary_preferences) payload.dietary_preferences = args.dietary_preferences;

                const { error: profErr } = await supabase.from("user_profile").update(payload).eq("user_id", userId);
                if (profErr) throw new Error(profErr.message);
                resultStr = "User profile updated and recalibrated.";
                actions.push({ type: "profile_updated", targetRoute: "/settings/profile", summary: "Profile updated" } as any);
                refreshScopes.add("dashboard");
                refreshScopes.add("profile" as any);
              } else if (tc.function.name === "create_social_post") {
                const { error: postErr } = await supabase.from("social_posts").insert({
                  user_id: userId,
                  content: args.content,
                  type: args.type || "achievement"
                });
                if (postErr) throw new Error(postErr.message);
                resultStr = "Social post shared to the community.";
                actions.push({ type: "social_posted", targetRoute: "/community", summary: "Social post shared" } as any);
                refreshScopes.add("social" as any);
              } else if (tc.function.name === "request_coach_assistance") {
                const { error: escErr } = await supabase.from("coach_escalations").insert({
                  user_id: userId,
                  topic: args.topic,
                  details: args.details,
                  urgency: "normal",
                  preferred_channel: "in_app",
                  status: "open"
                });
                if (escErr) throw new Error(escErr.message);
                resultStr = "A request for a human coach has been submitted.";
                actions.push({ type: "coach_requested", targetRoute: "/coach", summary: "Coach requested" } as any);
              } else if (tc.function.name === "generate_daily_plan") {
                const { composeDailyPlan } = await import("@/lib/plan/compose-daily-plan");
                const plan = await composeDailyPlan({ supabase, userId }, {
                  todayConstraints: {
                    location: args.location,
                    minutesAvailable: args.minutesAvailable
                  }
                });

                const { error: planErr } = await supabase.from("daily_plans").insert({
                  user_id: userId,
                  date_local: plan.date_local,
                  plan_json: plan,
                });
                if (planErr) throw new Error(planErr.message);
                resultStr = "Generated a new personalized plan for you. You can start the guided session now.";
                actions.push({ type: "plan_generated", targetRoute: `/log/workout/guided?date=${plan.date_local}`, summary: "Start Guided Session" } as any);
                refreshScopes.add("dashboard");
                refreshScopes.add("plan" as any);
              } else if (tc.function.name === "log_biometrics") {
                const weightLbs = Number(args.weight_lbs);
                const bodyFatPercent = Number(args.body_fat_percent);
                const hasWeight = Number.isFinite(weightLbs) && weightLbs > 0;
                const hasBodyFat =
                  Number.isFinite(bodyFatPercent) &&
                  bodyFatPercent >= 0 &&
                  bodyFatPercent <= 100;

                if (!hasWeight && !hasBodyFat) {
                  throw new Error("No valid biometrics provided.");
                }

                const { data: existingTarget, error: existingTargetError } = await supabase
                  .from("progress_tracking")
                  .select("track_id")
                  .eq("user_id", userId)
                  .eq("date", targetDate)
                  .maybeSingle();
                if (existingTargetError) throw new Error(existingTargetError.message);

                if (existingTarget?.track_id) {
                  const updatePayload: {
                    notes: string;
                    weight?: number;
                    body_fat_percent?: number;
                  } = {
                    notes: "Logged via Koda AI",
                  };
                  if (hasWeight) updatePayload.weight = toKgFromLbs(weightLbs);
                  if (hasBodyFat) updatePayload.body_fat_percent = bodyFatPercent;

                  const { error: updateError } = await supabase
                    .from("progress_tracking")
                    .update(updatePayload)
                    .eq("track_id", existingTarget.track_id);
                  if (updateError) throw new Error(updateError.message);
                } else {
                  const { error: insertError } = await supabase
                    .from("progress_tracking")
                    .insert({
                      user_id: userId,
                      date: targetDate,
                      weight: hasWeight ? toKgFromLbs(weightLbs) : null,
                      body_fat_percent: hasBodyFat ? bodyFatPercent : null,
                      measurements: {},
                      notes: "Logged via Koda AI",
                    });
                  if (insertError) throw new Error(insertError.message);
                }

                const summaryParts: string[] = [];
                if (hasWeight) {
                  summaryParts.push(
                    `${Math.round(weightLbs * 10) / 10} lbs (${toKgFromLbs(weightLbs)} kg)`
                  );
                }
                if (hasBodyFat) summaryParts.push(`${bodyFatPercent}% body fat`);
                resultStr = `Successfully logged biometrics: ${summaryParts.join(", ")}`;
                actions.push({
                  type: "biometrics_logged",
                  targetRoute: "/progress",
                  summary: "Progress updated",
                });
                refreshScopes.add("dashboard");
                refreshScopes.add("progress");
              } else if (tc.function.name === "navigate_to") {
                resultStr = `Triggered navigation to ${args.route}`;
                actions.push({
                  type: "navigation",
                  targetRoute: args.route,
                  summary: args.reason || "Moved to new page",
                } as any);
              } else if (tc.function.name === "show_movement_demo") {
                const { enrichExercise } = await import("@/lib/workout/enrich-exercises");
                const enriched = enrichExercise(args.exercise_name);
                if (enriched.cinema_video_url) {
                  resultStr = `Showing 4K demonstration for ${args.exercise_name}.`;
                  actions.push({
                    type: "video_demo",
                    targetRoute: enriched.cinema_video_url,
                    summary: `Demo: ${args.exercise_name}`,
                  } as any);
                } else {
                  resultStr = `I don't have a 4K demo for "${args.exercise_name}" yet, but I can provide coaching cues.`;
                }
              } else if (tc.function.name === "update_workout_plan") {
                const { data: existingPlan, error: fetchErr } = await supabase
                  .from("daily_plans")
                  .select("plan_json")
                  .eq("user_id", userId)
                  .eq("date_local", logDate)
                  .maybeSingle();

                if (fetchErr) throw new Error(fetchErr.message);

                let basePlan = (existingPlan?.plan_json as any) ?? null;
                if (!basePlan) {
                  const { composeDailyPlan } = await import("@/lib/plan/compose-daily-plan");
                  basePlan = await composeDailyPlan({ supabase, userId }, {});
                }

                const normalizedExercises = Array.isArray(args.exercises)
                  ? args.exercises.map((exercise: any) => normalizeToolExercise(exercise))
                  : [];

                const baseExercises = basePlan?.training_plan?.exercises ?? [];
                const parityResult = buildWorkoutParityGuard(baseExercises, normalizedExercises);
                const baseDurationMinutes =
                  basePlan?.training_plan?.duration_minutes ??
                  (existingPlan?.plan_json as any)?.training_plan?.duration_minutes ??
                  45;

                const newTrainingPlan = {
                  focus: args.focus,
                  duration_minutes: clampDurationMinutes(args.duration_minutes, baseDurationMinutes),
                  exercises: parityResult.exercises,
                  location_option:
                    basePlan?.training_plan?.location_option ||
                    (existingPlan?.plan_json as any)?.training_plan?.location_option ||
                    "gym",
                  alternatives:
                    basePlan?.training_plan?.alternatives ||
                    (existingPlan?.plan_json as any)?.training_plan?.alternatives ||
                    []
                };

                const updatedPlanJson = {
                  ...(basePlan || {}),
                  date_local: logDate,
                  training_plan: newTrainingPlan
                };

                const { error: upsertErr } = await supabase
                  .from("daily_plans")
                  .upsert({
                    user_id: userId,
                    date_local: logDate,
                    plan_json: updatedPlanJson,
                  }, { onConflict: "user_id,date_local" });

                if (upsertErr) throw new Error(upsertErr.message);
                
                resultStr = parityResult.parityGuard.requires_approval
                  ? `Updated today's workout plan with guardrails applied. Approval is required before launch.`
                  : `Successfully updated today's workout plan: ${args.focus}.`;
                actions.push({
                  type: "plan_daily", // iOS expects plan_daily for steering
                  targetRoute: `/log/workout/guided?date=${logDate}`,
                  summary: "Open Guided Workout",
                  payload: {
                    training_plan: newTrainingPlan,
                    parity_guard: parityResult.parityGuard,
                  }
                } as any);
                refreshScopes.add("dashboard");
                refreshScopes.add("plan" as any);
              } else {
                resultStr = "Unknown tool.";
              }
            } catch (e) {
              resultStr = `Failed to execute tool: ${e instanceof Error ? e.message : "unknown error"}`;
            }

            messagesForModel.push({
              role: "tool",
              tool_call_id: tc.id,
              name: tc.function.name,
              content: resultStr
            });
          }

          // Call model again with the tool output
          const finalResponse = await callModel({
            messages: messagesForModel,
          });
          return { reply: finalResponse.content };
        }

        return { reply: content };
      } catch (err) {
        throw err;
      }
    })();

    const content = reply;

    if (user?.id) {
      try {
        const { data: existing } = await supabase
          .from("ai_conversations")
          .select("convo_id, user_message_history")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const history =
          (existing?.user_message_history as Array<{ role: string; content: string }>) ?? [];
        const newHistory = [
          ...history.slice(-50),
          { role: "user", content: message },
          { role: "assistant", content },
        ];

        const summary = content.slice(0, 500);

        if (existing?.convo_id) {
          await supabase
            .from("ai_conversations")
            .update({
              user_message_history: newHistory,
              ai_reply_summary: summary,
              system_prompt_version: SYSTEM_PROMPT_VERSION,
            })
            .eq("convo_id", existing.convo_id);
        } else {
          await supabase.from("ai_conversations").insert({
            user_id: user.id,
            system_prompt_version: SYSTEM_PROMPT_VERSION,
            user_message_history: newHistory,
            ai_reply_summary: summary,
          });
        }
      } catch (persistErr) {
        console.error("ai_persist_error", {
          requestId,
          userId: user.id,
          error:
            persistErr instanceof Error ? persistErr.message : "unknown persist error",
        });
      }
    }

    return NextResponse.json({
      reply: content,
      action: actions.length > 0 ? actions[0] : undefined, // Legacy support for iOS
      actions: actions.length > 0 ? actions : undefined,
      refreshScopes:
        refreshScopes.size > 0 ? Array.from(refreshScopes) : undefined,
    });
  } catch (error) {
    console.error("ai_respond_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "AI service error.");
  }
}
