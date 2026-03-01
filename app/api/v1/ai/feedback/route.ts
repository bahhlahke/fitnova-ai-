import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { consumeToken } from "@/lib/api/rate-limit";
import { jsonError, makeRequestId } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

const RATE_LIMIT_CAPACITY = 25;
const RATE_LIMIT_REFILL_PER_SECOND = 25 / 60;

type FeedbackRequest = {
  domain?: "nutrition" | "motion" | "body_comp";
  output_id?: string;
  predicted_confidence?: number;
  user_rating?: number;
  correction_delta?: number | null;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toNormalizedRating(userRating: number): number {
  return clamp((userRating - 1) / 4, 0, 1);
}

export async function POST(request: Request) {
  const requestId = makeRequestId();

  let body: FeedbackRequest;
  try {
    body = (await request.json()) as FeedbackRequest;
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid JSON body.");
  }

  const domain = body.domain;
  const outputId = typeof body.output_id === "string" ? body.output_id.trim() : "";
  const predictedConfidence = Number(body.predicted_confidence);
  const userRating = Number(body.user_rating);
  const correctionDelta = body.correction_delta == null ? null : Number(body.correction_delta);

  if (!domain || !["nutrition", "motion", "body_comp"].includes(domain)) {
    return jsonError(400, "VALIDATION_ERROR", "domain is required.");
  }
  if (!outputId) {
    return jsonError(400, "VALIDATION_ERROR", "output_id is required.");
  }
  if (!Number.isFinite(predictedConfidence) || predictedConfidence < 0 || predictedConfidence > 1) {
    return jsonError(400, "VALIDATION_ERROR", "predicted_confidence must be 0-1.");
  }
  if (!Number.isInteger(userRating) || userRating < 1 || userRating > 5) {
    return jsonError(400, "VALIDATION_ERROR", "user_rating must be 1-5.");
  }
  if (correctionDelta != null && !Number.isFinite(correctionDelta)) {
    return jsonError(400, "VALIDATION_ERROR", "correction_delta must be numeric.");
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
      `ai-feedback:${user.id}`,
      RATE_LIMIT_CAPACITY,
      RATE_LIMIT_REFILL_PER_SECOND
    );
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(limiter.retryAfterSeconds) } }
      );
    }

    const feedbackInsert = await supabase.from("ai_feedback").insert({
      user_id: user.id,
      domain,
      output_id: outputId,
      predicted_confidence: predictedConfidence,
      user_rating: userRating,
      correction_delta: correctionDelta,
    });

    if (feedbackInsert.error) {
      return jsonError(500, "INTERNAL_ERROR", "Failed to store feedback.");
    }

    const profileRes = await supabase
      .from("ai_calibration_profiles")
      .select("sample_count, avg_user_rating, avg_correction_delta, confidence_bias, calibration_version")
      .eq("user_id", user.id)
      .eq("domain", domain)
      .maybeSingle();

    if (profileRes.error) {
      return jsonError(500, "INTERNAL_ERROR", "Failed to load calibration profile.");
    }

    const existing = (profileRes.data ?? {
      sample_count: 0,
      avg_user_rating: 0,
      avg_correction_delta: 0,
      confidence_bias: 0,
      calibration_version: 1,
    }) as {
      sample_count: number;
      avg_user_rating: number;
      avg_correction_delta: number;
      confidence_bias: number;
      calibration_version: number;
    };

    const nextCount = existing.sample_count + 1;
    const nextAvgUserRating =
      (existing.avg_user_rating * existing.sample_count + userRating) / nextCount;
    const nextAvgCorrectionDelta =
      (existing.avg_correction_delta * existing.sample_count + (correctionDelta ?? 0)) / nextCount;
    const normalizedRating = toNormalizedRating(userRating);
    const observationBias = predictedConfidence - normalizedRating;
    const nextBias =
      (existing.confidence_bias * existing.sample_count + observationBias) / nextCount;

    const calibrationUpsert = await supabase.from("ai_calibration_profiles").upsert(
      {
        user_id: user.id,
        domain,
        sample_count: nextCount,
        avg_user_rating: Number(nextAvgUserRating.toFixed(3)),
        avg_correction_delta: Number(nextAvgCorrectionDelta.toFixed(3)),
        confidence_bias: Number(nextBias.toFixed(4)),
        calibration_version: existing.calibration_version + 1,
      },
      { onConflict: "user_id,domain" }
    );

    if (calibrationUpsert.error) {
      return jsonError(500, "INTERNAL_ERROR", "Failed to update calibration profile.");
    }

    return NextResponse.json({
      ok: true,
      calibration: {
        domain,
        sample_count: nextCount,
        confidence_bias: Number(nextBias.toFixed(4)),
        calibration_version: existing.calibration_version + 1,
      },
    });
  } catch (error) {
    console.error("ai_feedback_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Internal server error.");
  }
}
