import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import { consumeToken } from "@/lib/api/rate-limit";
import { composeDailyPlan } from "@/lib/plan/compose-daily-plan";
import { detectPlateaus } from "@/lib/progression/plateau";
import { getSitFeatureFlags } from "@/lib/sit/feature-flags";
import { applyReadinessOrchestration } from "@/lib/sit/orchestrator";
import {
  ensureSitArtifacts,
  loadReadinessContext,
  persistPlanMutation,
  persistReadinessSnapshot,
  persistSafetyLedger,
} from "@/lib/sit/persistence";
import { ReadinessOrchestrator } from "@/lib/plan/safety";
import { buildCanonicalReadinessVector, evaluateReadinessVector } from "@/lib/sit/readiness";
import { validatePrescription } from "@/lib/sit/safety";
import { insertProductEvent } from "@/lib/telemetry/events";
import type { PlannerInputs } from "@/lib/plan/types";

export const dynamic = "force-dynamic";

const RATE_LIMIT_CAPACITY = 10;
const RATE_LIMIT_REFILL_PER_SECOND = 10 / 60;

export async function POST(request: Request) {
  const requestId = makeRequestId();
  const sitFlags = getSitFeatureFlags();

  let body: PlannerInputs | undefined;
  try {
    body = (await request.json()) as PlannerInputs;
  } catch {
    body = {};
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
      `plan:${user.id}`,
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

    const [plan, plateau] = await Promise.all([
      composeDailyPlan({ supabase, userId: user.id }, body ?? {}),
      detectPlateaus(user.id)
    ]);

    await ensureSitArtifacts(supabase);

    const readinessContext = await loadReadinessContext(supabase, user.id, plan.date_local);
    const readinessVector = buildCanonicalReadinessVector({
      dateLocal: plan.date_local,
      signals: readinessContext.signals,
      checkIns: readinessContext.checkIns,
      workouts: readinessContext.workouts,
      profile: readinessContext.profile,
    });
    const readinessSnapshot = evaluateReadinessVector(readinessVector);
    await persistReadinessSnapshot(supabase, user.id, readinessSnapshot);
    await insertProductEvent(supabase, user.id, "readiness_snapshot_created", {
      pathway: readinessSnapshot.pathway,
      score: readinessSnapshot.score,
      confidence: readinessSnapshot.confidence,
      policy_version: readinessSnapshot.policy_version,
    });

    const orchestrated = applyReadinessOrchestration(
      plan,
      readinessSnapshot,
      sitFlags.readinessOrchestratorMode
    );

    let finalPlan = orchestrated.plan;
    if (plateau.is_plateau) {
      (finalPlan as any).plateau_insight = plateau;
    }
    if (orchestrated.mutationTrace) {
      (finalPlan as any).mutation_trace = orchestrated.mutationTrace;
      (finalPlan as any).adaptation_rationale = orchestrated.mutationTrace.summary;
      (finalPlan as any).readiness_snapshot = {
        pathway: readinessSnapshot.pathway,
        score: readinessSnapshot.score,
        confidence: readinessSnapshot.confidence,
        reasons: readinessSnapshot.reason_codes,
      };
      await persistPlanMutation(
        supabase,
        user.id,
        plan.date_local,
        plan,
        finalPlan,
        orchestrated.mutationTrace
      );
      await insertProductEvent(supabase, user.id, "plan_mutation_applied", {
        pathway: readinessSnapshot.pathway,
        shadow_mode: orchestrated.mutationTrace.shadow_mode,
        policy_version: orchestrated.mutationTrace.policy_version,
      });
    }

    const validation = validatePrescription({
      plan: finalPlan,
      profile: readinessContext.profile,
      workouts: readinessContext.workouts,
      priorPlans: readinessContext.priorPlans,
      painFlags: readinessSnapshot.features.pain_flags,
    });

    if (validation.status !== "pass" || sitFlags.safetyValidatorEnforce) {
      await persistSafetyLedger(supabase, user.id, plan.date_local, finalPlan, validation);
    }

    if (validation.status === "blocked") {
      await insertProductEvent(supabase, user.id, "prescription_blocked", {
        reason_codes: validation.issues.map((issue) => issue.code),
        policy_version: validation.policy_version,
      });
      return NextResponse.json(
        {
          code: "UNSAFE_PLAN",
          error: "Plan blocked by safety validator.",
          reasons: validation.issues,
          readiness_snapshot: readinessSnapshot,
        },
        { status: 409 }
      );
    }

    if (validation.status === "modified") {
      finalPlan = validation.plan;
      (finalPlan as any).safety_validation = {
        status: validation.status,
        issues: validation.issues,
        policy_version: validation.policy_version,
      };
    }

    const safetyOrchestrator = new ReadinessOrchestrator(supabase, user.id);
    const safetyResult = await safetyOrchestrator.evaluatePlan(
      finalPlan.training_plan.focus,
      finalPlan.training_plan.exercises[0]?.intensity || "moderate"
    );

    if (safetyResult.adjustment_required) {
      finalPlan.safety_notes = [
        ...(finalPlan.safety_notes || []),
        safetyResult.adjustment_notes,
      ].filter(Boolean) as string[];
      (finalPlan as any).safety_ready_status = safetyResult.risk_level;
    }

    const { error: insertErr } = await supabase.from("daily_plans").insert({
      user_id: user.id,
      date_local: finalPlan.date_local,
      plan_json: finalPlan,
    });

    if (insertErr) {
      console.error("daily_plan_insert_failed", {
        requestId,
        userId: user.id,
        message: insertErr.message,
      });
      return jsonError(500, "INTERNAL_ERROR", "Failed to save daily plan.");
    }

    return NextResponse.json({
      plan: finalPlan,
      readiness_snapshot: readinessSnapshot,
      mutation_trace: orchestrated.mutationTrace,
      safety_validation:
        validation.status !== "pass"
          ? {
              status: validation.status,
              issues: validation.issues,
              policy_version: validation.policy_version,
            }
          : undefined,
    });
  } catch (error) {
    console.error("daily_plan_unhandled", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonError(500, "INTERNAL_ERROR", "Internal server error.");
  }
}
