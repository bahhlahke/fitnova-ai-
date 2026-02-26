/**
 * POST /api/v1/ai/analyze-meal
 *
 * Accepts either:
 *   { type: "text",  description: string }
 *   { type: "image", data: string }   ← base64 data-URL (max ~800 px, JPEG)
 *
 * Returns:
 *   { name, calories, protein, carbs, fat, confidence, notes }
 *
 * Uses gpt-4o-mini (vision-capable) for both modes via OpenRouter.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { consumeToken } from "@/lib/api/rate-limit";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const TEXT_MODEL     = "openai/gpt-4o-mini";
const VISION_MODEL   = "openai/gpt-4o-mini"; // gpt-4o-mini supports vision
const RATE_CAPACITY  = 15;
const RATE_REFILL    = 15 / 60; // 15 per minute

function withTimeout(ms: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(id) };
}

const SYSTEM_PROMPT = `You are a world-class nutritionist and dietitian with expert knowledge of food portion sizes, cooking methods, and macro composition.

Your task is to estimate the nutritional content of a meal from either a text description or a photo.

Rules:
- Be realistic and specific. Use standard serving sizes where applicable.
- When unsure, err towards slightly higher calorie estimates (food photography often under-represents portions).
- For mixed dishes, estimate each component separately then sum.
- Output ONLY valid JSON — no markdown, no explanation outside the JSON.

Return this exact shape:
{
  "name": "short friendly meal name (max 60 chars)",
  "calories": number (integer kcal),
  "protein": number (grams, integer),
  "carbs": number (grams, integer),
  "fat": number (grams, integer),
  "confidence": "high" | "medium" | "low",
  "notes": "one short sentence on what drives the calorie estimate, or key nutrients to note"
}

Confidence guide:
- high: description/photo is clear and specific enough for a reliable estimate
- medium: some ambiguity about portion size or ingredients
- low: very little info, very wide confidence interval`;

export interface MealEstimate {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: "high" | "medium" | "low";
  notes: string;
}

function validateEstimate(raw: unknown): MealEstimate | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (
    typeof r.name     !== "string" ||
    typeof r.calories !== "number" ||
    typeof r.protein  !== "number" ||
    typeof r.carbs    !== "number" ||
    typeof r.fat      !== "number" ||
    !["high", "medium", "low"].includes(r.confidence as string)
  ) return null;

  return {
    name:       r.name.slice(0, 80),
    calories:   Math.max(0, Math.round(r.calories)),
    protein:    Math.max(0, Math.round(r.protein)),
    carbs:      Math.max(0, Math.round(r.carbs)),
    fat:        Math.max(0, Math.round(r.fat)),
    confidence: r.confidence as "high" | "medium" | "low",
    notes:      typeof r.notes === "string" ? r.notes.slice(0, 200) : "",
  };
}

export async function POST(request: Request) {
  const requestId = makeRequestId();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return jsonError(503, "SERVICE_UNAVAILABLE", "AI service is not configured.");
  }

  // ── Parse body ─────────────────────────────────────────────────
  let body: { type?: string; description?: string; data?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch (_e) {
    return jsonError(400, "INVALID_JSON", "Invalid JSON body.");
  }

  const mode = body.type === "image" ? "image" : "text";

  if (mode === "text") {
    const desc = typeof body.description === "string" ? body.description.trim() : "";
    if (!desc || desc.length < 3) {
      return jsonError(400, "VALIDATION_ERROR", "Please provide a meal description.");
    }
    if (desc.length > 1000) {
      return jsonError(400, "VALIDATION_ERROR", "Description too long (max 1000 characters).");
    }
  } else {
    const data = typeof body.data === "string" ? body.data.trim() : "";
    if (!data.startsWith("data:image/")) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid image data.");
    }
    // Rough size check: 5 MB base64 ≈ ~3.75 MB image — reject anything larger
    if (data.length > 7_000_000) {
      return jsonError(400, "VALIDATION_ERROR", "Image too large. Please send a compressed version.");
    }
  }

  // ── Auth + rate-limit ──────────────────────────────────────────
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return jsonError(401, "AUTH_REQUIRED", "Sign in required.");
    }

    const limiter = consumeToken(
      `analyze-meal:${user.id}`,
      RATE_CAPACITY,
      RATE_REFILL
    );
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(limiter.retryAfterSeconds) } }
      );
    }

    // ── Build messages ─────────────────────────────────────────────
    type OAIMessage = { role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }> };
    let messages: OAIMessage[];
    let model: string;

    if (mode === "text") {
      model    = TEXT_MODEL;
      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role:    "user",
          content: `Meal description:\n"${body.description!}"\n\nEstimate the nutrition and return JSON.`,
        },
      ];
    } else {
      model    = VISION_MODEL;
      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type:      "image_url",
              image_url: { url: body.data!, detail: "auto" },
            },
            {
              type: "text",
              text: "This is a photo of a meal I ate. Please estimate the nutrition content and return JSON.",
            },
          ],
        },
      ];
    }

    // ── Call AI ────────────────────────────────────────────────────
    const payload = {
      model,
      messages,
      max_tokens:  350,
      temperature: 0.3,
      response_format: { type: "json_object" },
    };

    const timer = withTimeout(20_000);
    const res = await fetch(OPENROUTER_URL, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer":  "https://fitnova.app",
        "X-Title":       "FitNova AI",
      },
      body:   JSON.stringify(payload),
      signal: timer.signal,
    });
    timer.done();

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error("analyze_meal_upstream_error", { requestId, status: res.status, errBody });
      return jsonError(502, "UPSTREAM_ERROR", "AI provider request failed.");
    }

    const aiData = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = (aiData.choices?.[0]?.message?.content ?? "").trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (_e) {
      console.error("analyze_meal_parse_error", { requestId, raw });
      return jsonError(502, "UPSTREAM_ERROR", "AI returned unexpected format.");
    }

    const estimate = validateEstimate(parsed);
    if (!estimate) {
      console.error("analyze_meal_invalid_schema", { requestId, parsed });
      return jsonError(502, "UPSTREAM_ERROR", "AI returned incomplete nutrition data.");
    }

    return NextResponse.json({ estimate, mode });
  } catch (err) {
    console.error("analyze_meal_unhandled", {
      requestId,
      error: err instanceof Error ? err.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "AI service error.");
  }
}
