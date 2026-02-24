/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => ({ insert: vi.fn().mockResolvedValue({ error: null }) })),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
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
  });
});
