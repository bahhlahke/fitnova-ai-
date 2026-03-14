/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { createClient } from "@/lib/supabase/server";
import { validatePrescription } from "@/lib/sit/safety";

const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => {
    const queryBuilder = {
      insert: mockInsert,
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    return queryBuilder;
  }),
};

vi.mock("@/lib/progression/plateau", () => ({
  detectPlateaus: vi.fn(async () => ({ is_plateau: false, metrics: {} })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

vi.mock("@/lib/sit/persistence", () => ({
  ensureSitArtifacts: vi.fn(async () => undefined),
  loadReadinessContext: vi.fn(async () => ({
    profile: { experience_level: "intermediate" },
    signals: [],
    checkIns: [],
    workouts: [],
    priorPlans: [],
  })),
  persistPlanMutation: vi.fn(async () => undefined),
  persistReadinessSnapshot: vi.fn(async () => undefined),
  persistSafetyLedger: vi.fn(async () => undefined),
}));

vi.mock("@/lib/sit/readiness", () => ({
  buildCanonicalReadinessVector: vi.fn(() => ({
    date_local: "2026-02-24",
    provider_confidence: 0.8,
    data_completeness: 0.8,
    recovery_score: 80,
    sleep_hours: 8,
    sleep_debt_hours: 0,
    hrv: 70,
    hrv_delta: 2,
    resting_hr: 50,
    resting_hr_delta: -1,
    strain_score: 9,
    respiration_rate_avg: null,
    spo2_avg: null,
    blood_glucose_avg: null,
    steps: 9000,
    acwr: 1,
    soreness_severity: 0,
    adherence_decay: 0.1,
    pain_flags: [],
    reasons: [],
    providers: ["whoop"],
  })),
  evaluateReadinessVector: vi.fn(() => ({
    snapshot_date: "2026-02-24",
    pathway: "amber",
    score: 68,
    confidence: 0.81,
    reason_codes: ["sleep_debt_high"],
    policy_version: "readiness-orchestrator-v1",
    features: { pain_flags: [] },
  })),
}));

vi.mock("@/lib/sit/orchestrator", () => ({
  applyReadinessOrchestration: vi.fn((plan: any) => ({
    plan: {
      ...plan,
      adaptation_rationale: "Amber readiness detected.",
    },
    mutationTrace: {
      policy_version: "readiness-orchestrator-v1",
      pathway: "amber",
      shadow_mode: true,
      reasons: ["sleep_debt_high"],
      summary: "Amber readiness detected.",
      before: { duration_minutes: 45, exercises: [] },
      after: { duration_minutes: 40, exercises: [] },
    },
  })),
}));

vi.mock("@/lib/sit/safety", () => ({
  validatePrescription: vi.fn((input: any) => ({
    status: "pass",
    plan: input.plan,
    issues: [],
    policy_version: "safety-validator-v1",
  })),
}));

vi.mock("@/lib/sit/feature-flags", () => ({
  getSitFeatureFlags: vi.fn(() => ({
    safetyValidatorEnforce: false,
    readinessOrchestratorMode: "shadow",
    autoMutationTrace: true,
    voiceDuplexStreaming: false,
    iosCvRepSegmentation: false,
  })),
}));

vi.mock("@/lib/telemetry/events", () => ({
  insertProductEvent: vi.fn(async () => undefined),
}));

vi.mock("@/lib/plan/compose-daily-plan", () => ({
  composeDailyPlan: vi.fn(async () => ({
    date_local: "2026-02-24",
    training_plan: {
      focus: "Fat-loss focused strength + conditioning",
      duration_minutes: 45,
      location_option: "gym",
      exercises: [{ name: "Back Squat", sets: 4, reps: "6-8", intensity: "RPE 7" }],
      alternatives: ["If short on time, complete first 3 exercises only."],
    },
    nutrition_plan: {
      calorie_target: 2100,
      macros: { protein_g: 160, carbs_g: 190, fat_g: 70 },
      meal_structure: ["Meal 1"],
      hydration_goal_liters: 2.5,
    },
    safety_notes: ["Not medical advice."],
  })),
}));

describe("POST /api/v1/plan/daily", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
  });

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const req = new Request("http://localhost/api/v1/plan/daily", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.code).toBe("AUTH_REQUIRED");
  });

  it("returns plan payload for authenticated user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    const req = new Request("http://localhost/api/v1/plan/daily", {
      method: "POST",
      body: JSON.stringify({ todayConstraints: { minutesAvailable: 35 } }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.plan.training_plan).toBeTruthy();
    expect(data.plan.nutrition_plan).toBeTruthy();
    expect(Array.isArray(data.plan.safety_notes)).toBe(true);
    expect(data.readiness_snapshot?.pathway).toBe("amber");
    expect(data.mutation_trace?.policy_version).toBe("readiness-orchestrator-v1");
  });

  it("blocks unsafe plans even when flags are not explicitly enforcing", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    vi.mocked(validatePrescription).mockReturnValueOnce({
      status: "blocked",
      plan: {
        date_local: "2026-02-24",
        training_plan: {
          focus: "Blocked",
          duration_minutes: 45,
          location_option: "gym",
          exercises: [{ name: "Back Squat", sets: 4, reps: "6-8", intensity: "RPE 9" }],
          alternatives: [],
        },
        nutrition_plan: {
          calorie_target: 2100,
          macros: { protein_g: 160, carbs_g: 190, fat_g: 70 },
          meal_structure: ["Meal 1"],
          hydration_goal_liters: 2.5,
        },
        safety_notes: ["Not medical advice."],
      } as any,
      issues: [{ code: "pain_guardrail", message: "Pain flags require a lower-intensity prescription.", severity: "block" }],
      policy_version: "safety-validator-v1",
    });

    const res = await POST(
      new Request("http://localhost/api/v1/plan/daily", {
        method: "POST",
        body: JSON.stringify({ todayConstraints: { minutesAvailable: 35 } }),
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(res.status).toBe(409);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
