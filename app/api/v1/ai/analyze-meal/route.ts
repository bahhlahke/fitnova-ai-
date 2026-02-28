import { NextResponse } from "next/server";
import { callModel } from "@/lib/ai/model";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";

type AnalyzeMealRequest =
  | { type: "text"; description: string }
  | { type: "image"; data: string };

type AnalyzeMealEstimate = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: "high" | "medium" | "low";
  notes: string;
};

function sanitizeEstimate(input: Partial<AnalyzeMealEstimate>): AnalyzeMealEstimate {
  return {
    name: typeof input.name === "string" && input.name.trim() ? input.name.trim() : "Meal",
    calories: Number.isFinite(input.calories) ? Math.max(0, Math.round(input.calories as number)) : 0,
    protein: Number.isFinite(input.protein) ? Math.max(0, Math.round(input.protein as number)) : 0,
    carbs: Number.isFinite(input.carbs) ? Math.max(0, Math.round(input.carbs as number)) : 0,
    fat: Number.isFinite(input.fat) ? Math.max(0, Math.round(input.fat as number)) : 0,
    confidence:
      input.confidence === "high" || input.confidence === "medium" || input.confidence === "low"
        ? input.confidence
        : "medium",
    notes:
      typeof input.notes === "string" && input.notes.trim()
        ? input.notes.trim()
        : "Estimate generated from the meal description.",
  };
}

function parseEstimate(raw: string): AnalyzeMealEstimate | null {
  const cleaned = raw.replace(/```json|```/gi, "").trim();

  try {
    return sanitizeEstimate(JSON.parse(cleaned) as Partial<AnalyzeMealEstimate>);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const requestId = makeRequestId();

  let body: AnalyzeMealRequest;
  try {
    body = (await request.json()) as AnalyzeMealRequest;
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid JSON body.");
  }

  const isTextRequest =
    body.type === "text" &&
    typeof body.description === "string" &&
    body.description.trim().length >= 3;
  const isImageRequest =
    body.type === "image" &&
    typeof body.data === "string" &&
    body.data.startsWith("data:image/");

  if (!isTextRequest && !isImageRequest) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "Provide a valid text description or image payload."
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");
    }

    const systemPrompt =
      'Return only JSON. Estimate a meal using realistic nutrition values. Output exactly: {"name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"confidence":"high|medium|low","notes":"string"}.';

    const userContent =
      body.type === "text"
        ? `Estimate macros for this meal: ${body.description}`
        : ([
            {
              type: "text" as const,
              text:
                "Estimate this photographed meal. Identify the likely meal, estimate calories and macros, and keep notes concise.",
            },
            {
              type: "image_url" as const,
              image_url: { url: body.data },
            },
          ]);

    const { content } = await callModel({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      maxTokens: 300,
      temperature: 0.2,
    });

    const estimate = parseEstimate(content);
    if (!estimate) {
      throw new Error("Failed to parse AI response.");
    }

    return NextResponse.json({ estimate });
  } catch (error) {
    console.error("analyze_meal_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Failed to estimate nutrition.");
  }
}
