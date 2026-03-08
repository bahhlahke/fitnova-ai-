/**
 * POST /api/v1/ai/respond — AI coach chat.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assembleContext } from "@/lib/ai/assemble-context";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { consumeToken } from "@/lib/api/rate-limit";
import { callModel } from "@/lib/ai/model";
import type { AiActionResult, RefreshScope } from "@/types";

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

function resolveLogDate(localDate: string | undefined): string {
  if (typeof localDate === "string") {
    const trimmed = localDate.trim();
    if (isValidLocalDate(trimmed)) return trimmed;
  }
  return new Date().toISOString().slice(0, 10);
}

function toKgFromLbs(lbs: number): number {
  return Math.round(lbs * 0.45359237 * 10) / 10;
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
  const logDate = resolveLogDate(body.localDate);
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

    let systemPrompt =
      "You are an elite AI Performance Coach & Sports Scientist with a PhD in Exercise Physiology. Respond with the precision and authority of a world-class expert.\n\n" +
      "You have direct control over the application. You can:\n" +
      "- Log food (`log_meal`) and water (`log_hydration`).\n" +
      "- Log workouts (`log_workout`) with `calories_burned` for expenditure.\n" +
      "- Record daily check-ins (`log_daily_check_in`) regarding energy and sleep.\n" +
      "- Correct logs by removing meals (`remove_meal`).\n" +
      "- Update the user's calibration, goals, and limitations (`update_user_profile`).\n" +
      "- Share achievements to the activity feed (`create_social_post`).\n" +
      "- Create new personalized plans (`generate_daily_plan`) based on time/equipment.\n" +
      "- Navigate the user to a specific page context (`navigate_to`).\n" +
      "- Escalate complex medical or technical issues to a human coach (`request_coach_assistance`).\n\n" +
      "Synthesis Logic: Analyze the user's longitudinal data (HRV, PRs, Sleep) to provide high-performance insights typically reserved for Olympic teams. Always prefer taking action when the user reports data. End with a concrete next step.";

    if (user?.id) {
      try {
        const { systemPrompt: assembled } = await assembleContext(supabase, user.id);
        systemPrompt = `${assembled}\n\n${SAFETY_POLICY}`;
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
              fat: { type: "number", description: "Estimated fat in grams." }
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
              notes: { type: "string", description: "Summary of the workout" }
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
              meal_description: { type: "string", description: "Partial or full description of the meal to remove, e.g. 'banana'." }
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
              liters: { type: "number", description: "Amount of fluid in liters." }
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
          description: "Triggers a new daily plan generation with optional constraints.",
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
              body_fat_percent: { type: "number", description: "Body fat percentage" }
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
                  .eq("date", logDate)
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
                      date: logDate,
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
                  date: logDate,
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
                  .eq("date", logDate)
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
                  .eq("date", logDate)
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
                    date: logDate,
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
                  date_local: logDate,
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
                  .eq("date", logDate)
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
                      date: logDate,
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
