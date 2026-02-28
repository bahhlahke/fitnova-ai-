/**
 * POST /api/v1/ai/respond — AI coach chat.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assembleContext } from "@/lib/ai/assemble-context";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { consumeToken } from "@/lib/api/rate-limit";
import { callModel } from "@/lib/ai/model";
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

  let body: { message?: string };
  try {
    body = (await request.json()) as { message?: string };
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid JSON body.");
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
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
      "You are a personal AI fitness coach and nutritionist for FitNova. Be concise and warm. Give clear, actionable answers and end with one concrete next step. When relevant, offer one alternative. You are educational support only; direct users to seek medical care for pain or health concerns.";

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
          description: "Logs a completed workout session.",
          parameters: {
            type: "object",
            properties: {
              workout_type: { type: "string", enum: ["strength", "cardio", "mobility", "other"], description: "Type of workout" },
              duration_minutes: { type: "number", description: "Duration in minutes" },
              notes: { type: "string", description: "Summary of the workout" }
            },
            required: ["workout_type", "duration_minutes"]
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
      }
    ];

    let messagesForModel: any[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ];

    const { reply } = await (async () => {
      try {
        const { content, tool_calls } = await callModel({
          messages: messagesForModel,
          tools: OMNI_TOOLS as any,
          tool_choice: "auto",
        });

        if (tool_calls && tool_calls.length > 0) {
          messagesForModel.push({ role: "assistant", content, tool_calls });

          for (const tc of tool_calls) {
            let resultStr = "";
            try {
              const args = JSON.parse(tc.function.arguments);
              if (tc.function.name === "log_meal") {
                const today = new Date().toISOString().split("T")[0];
                const { data: existingLog } = await supabase.from("nutrition_logs")
                  .select("log_id, meals, total_calories").eq("user_id", userId).eq("date", today).maybeSingle();

                const newMeal = { time: new Date().toTimeString().slice(0, 5), description: args.food_items, calories: args.calories, macros: { protein: args.protein, carbs: args.carbs, fat: args.fat } as any };

                if (existingLog) {
                  const updatedMeals = [...(Array.isArray(existingLog.meals) ? existingLog.meals : []), newMeal];
                  const totalCals = updatedMeals.reduce((s: number, m: any) => s + (m.calories || 0), 0);
                  await supabase.from("nutrition_logs").update({ meals: updatedMeals, total_calories: totalCals }).eq("log_id", existingLog.log_id);
                } else {
                  await supabase.from("nutrition_logs").insert({ user_id: userId, date: today, meals: [newMeal], total_calories: args.calories });
                }
                resultStr = `Successfully logged meal: ${args.food_items} (${args.calories} cals)`;
              } else if (tc.function.name === "log_workout") {
                const today = new Date().toISOString().split("T")[0];
                await supabase.from("workout_logs").insert({
                  user_id: userId,
                  date: today,
                  workout_type: args.workout_type,
                  duration_minutes: args.duration_minutes,
                  exercises: [],
                  notes: args.notes || "Logged via Nova AI"
                });
                resultStr = `Successfully logged workout: ${args.duration_minutes} min ${args.workout_type}`;
              } else if (tc.function.name === "log_biometrics") {
                const today = new Date().toISOString().split("T")[0];
                await supabase.from("progress_tracking").insert({
                  user_id: userId,
                  date: today,
                  weight: args.weight_lbs || null,
                  body_fat_percent: args.body_fat_percent || null,
                  measurements: {},
                  notes: "Logged via Nova AI"
                });
                resultStr = `Successfully logged biometrics: ${args.weight_lbs ? args.weight_lbs + " lbs " : ""}${args.body_fat_percent ? args.body_fat_percent + "% body fat" : ""}`;
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

    return NextResponse.json({ reply: content });
  } catch (error) {
    console.error("ai_respond_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "AI service error.");
  }
}
