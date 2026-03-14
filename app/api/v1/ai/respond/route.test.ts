/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

describe("POST /api/v1/ai/respond", () => {
  const originalEnv = process.env.OPENROUTER_API_KEY;
  const originalAllowAnon = process.env.ALLOW_DEV_ANON_AI;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockSupabase.auth.getUser.mockReset();
    mockSupabase.from.mockReset();
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.ALLOW_DEV_ANON_AI = "false";
  });

  it("returns 400 when body is not valid JSON", async () => {
    const req = new Request("http://localhost/api/v1/ai/respond", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.code).toBe("INVALID_JSON");
  });

  it("returns 401 when user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const req = new Request("http://localhost/api/v1/ai/respond", {
      method: "POST",
      body: JSON.stringify({ message: "hello" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.code).toBe("AUTH_REQUIRED");
  });

  it("returns 400 when message exceeds max length", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    const req = new Request("http://localhost/api/v1/ai/respond", {
      method: "POST",
      body: JSON.stringify({ message: "x".repeat(2001) }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 503 when OPENROUTER_API_KEY is not set", async () => {
    process.env.OPENROUTER_API_KEY = "";
    const req = new Request("http://localhost/api/v1/ai/respond", {
      method: "POST",
      body: JSON.stringify({ message: "Hello" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("returns 200 and reply when authenticated and provider succeeds", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "ai_conversations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      };
    });

    const mockReply = "Here is some coach advice.";
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content: mockReply } }],
            }),
        } as Response)
      )
    );

    const req = new Request("http://localhost/api/v1/ai/respond", {
      method: "POST",
      body: JSON.stringify({ message: "How do I get stronger?" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reply).toBe(mockReply);
  });

  it("processes tool calls and logs biometrics successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    const progressInsert = vi.fn().mockResolvedValue({ error: null });
    const progressUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const progressUpdate = vi.fn().mockReturnValue({ eq: progressUpdateEq });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "progress_tracking") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: progressInsert,
          update: progressUpdate,
        };
      }

      if (table === "ai_conversations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    const mockToolCallResponse = {
      content: "",
      tool_calls: [
        {
          id: "call_123",
          type: "function",
          function: { name: "log_biometrics", arguments: JSON.stringify({ weight_lbs: 185, body_fat_percent: 12 }) }
        }
      ]
    };

    const mockFinalResponse = {
      content: "Successfully logged 185 lbs and 12% body fat.",
    };

    const fetchMock = vi.fn()
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                choices: [{ message: { content: "", tool_calls: mockToolCallResponse.tool_calls } }],
              }),
          } as Response)
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                choices: [{ message: { content: mockFinalResponse.content } }],
              }),
          } as Response)
        );
    vi.stubGlobal("fetch", fetchMock);

    const req = new Request("http://localhost/api/v1/ai/respond", {
      method: "POST",
      body: JSON.stringify({
        message: "I weigh 185 lbs today at 12% BF.",
        localDate: "2026-02-28",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reply).toBe(mockFinalResponse.content);
    expect(data.actions).toEqual([
      {
        type: "biometrics_logged",
        targetRoute: "/progress",
        summary: "Progress updated",
      },
    ]);
    expect(data.refreshScopes).toEqual(
      expect.arrayContaining(["dashboard", "progress"])
    );
    expect(progressInsert).toHaveBeenCalledWith({
      user_id: "u1",
      date: "2026-02-28",
      weight: 83.9,
      body_fat_percent: 12,
      measurements: {},
      notes: "Logged via Koda AI",
    });
    expect(progressUpdate).not.toHaveBeenCalled();
  });

  it("processes log_workout with calories_burned", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const workoutInsert = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "workout_logs") return { insert: workoutInsert };
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      };
    });

    vi.stubGlobal("fetch", vi.fn()
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: "", tool_calls: [{ id: "c1", type: "function", function: { name: "log_workout", arguments: JSON.stringify({ workout_type: "cardio", duration_minutes: 30, calories_burned: 400 }) } }] } }],
        }),
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: "Logged your 400 cal workout." } }] }),
      }))
    );

    const req = new Request("http://localhost/api/v1/ai/respond", {
      method: "POST",
      body: JSON.stringify({ message: "I burned 400 calories on the Peloton." }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(workoutInsert).toHaveBeenCalledWith(expect.objectContaining({
      workout_type: "cardio",
      duration_minutes: 30,
      calories_burned: 400
    }));
  });

  it("processes remove_meal successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const initialMeals = [{ description: "banana", calories: 100 }, { description: "apple", calories: 50 }];
    const nutritionUpdate = vi.fn().mockResolvedValue({ error: null });
    const nutritionUpdateEq = vi.fn().mockReturnValue({ error: null });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "nutrition_logs") return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { log_id: "l1", meals: initialMeals } }),
        update: vi.fn().mockReturnValue({ eq: nutritionUpdateEq })
      };
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    });

    vi.stubGlobal("fetch", vi.fn()
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: "", tool_calls: [{ id: "c2", type: "function", function: { name: "remove_meal", arguments: JSON.stringify({ meal_description: "banana" }) } }] } }],
        }),
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: "Removed the banana." } }] }),
      }))
    );

    const req = new Request("http://localhost/api/v1/ai/respond", {
      method: "POST",
      body: JSON.stringify({ message: "Remove the banana." }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(nutritionUpdateEq).toHaveBeenCalled();
  });

  it("processes log_hydration successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const hydrationUpdateEq = vi.fn().mockResolvedValue({ error: null });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "nutrition_logs") return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { log_id: "l1", hydration_liters: 1 } }),
        update: vi.fn().mockReturnValue({ eq: hydrationUpdateEq })
      };
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    });

    vi.stubGlobal("fetch", vi.fn()
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: "", tool_calls: [{ id: "c3", type: "function", function: { name: "log_hydration", arguments: JSON.stringify({ liters: 0.5 }) } }] } }],
        }),
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: "Logged 0.5L." } }] }),
      }))
    );

    const req = new Request("http://localhost/api/v1/ai/respond", {
      method: "POST",
      body: JSON.stringify({ message: "I drank half a liter of water." }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(hydrationUpdateEq).toHaveBeenCalled();
  });

  it("processes log_daily_check_in successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const checkInInsert = vi.fn().mockResolvedValue({ error: null });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "check_ins") return { insert: checkInInsert };
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    });

    vi.stubGlobal("fetch", vi.fn()
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: "", tool_calls: [{ id: "c4", type: "function", function: { name: "log_daily_check_in", arguments: JSON.stringify({ energy_score: 4, sleep_hours: 8 }) } }] } }],
        }),
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: "Logged your check-in." } }] }),
      }))
    );

    const req = new Request("http://localhost/api/v1/ai/respond", {
      method: "POST",
      body: JSON.stringify({ message: "I'm feeling good, slept 8 hours." }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(checkInInsert).toHaveBeenCalledWith(expect.objectContaining({
      energy_score: 4,
      sleep_hours: 8
    }));
  });

  it("updates today's workout plan with guided-coach-ready exercise details", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const dailyPlanUpsert = vi.fn().mockResolvedValue({ error: null });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "daily_plans") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              plan_json: {
                date_local: "2026-03-13",
                training_plan: {
                  focus: "Existing Plan",
                  duration_minutes: 45,
                  location_option: "gym",
                  exercises: [],
                  alternatives: ["Swap to dumbbells if needed"],
                },
                nutrition_plan: {
                  calorie_target: 2200,
                  macros: { protein_g: 180, carbs_g: 220, fat_g: 70 },
                  meal_structure: [],
                  hydration_goal_liters: 3,
                },
                safety_notes: [],
              },
            },
            error: null,
          }),
          upsert: dailyPlanUpsert,
        };
      }

      if (table === "ai_conversations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    });

    const fetchMock = vi.fn()
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [{ embedding: [0.12, 0.34, 0.56] }] }),
        } as Response)
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [{
                message: {
                  content: "",
                  tool_calls: [{
                    id: "c5",
                    type: "function",
                    function: {
                      name: "update_workout_plan",
                      arguments: JSON.stringify({
                        focus: "Lower Body Strength",
                        duration_minutes: 55,
                        exercises: [{
                          name: "Back Squat",
                          sets: 4,
                          reps: "5",
                          intensity: "RPE 8",
                          notes: "Treat every rep like a competition setup.",
                          rest_seconds_after_set: 120,
                          target_rir: 2,
                          target_load_kg: 102.5,
                          progression_note: "Add 2.5 kg next week if bar speed stays crisp.",
                        }],
                      }),
                    },
                  }],
                },
              }],
            }),
        } as Response)
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ choices: [{ message: { content: "Updated your guided session." } }] }),
        } as Response)
      );
    vi.stubGlobal("fetch", fetchMock);

    const req = new Request("http://localhost/api/v1/ai/respond", {
      method: "POST",
      body: JSON.stringify({
        message: "Build me a lower body strength session for today.",
        localDate: "2026-03-13",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(dailyPlanUpsert).toHaveBeenCalledTimes(1);

    const data = await res.json();
    expect(data.actions).toEqual([
      expect.objectContaining({
        type: "plan_daily",
        targetRoute: "/log/workout/guided?date=2026-03-13",
        summary: "Open Guided Workout",
      }),
    ]);

    const [payload, options] = dailyPlanUpsert.mock.calls[0];
    expect(options).toEqual({ onConflict: "user_id,date_local" });
    expect(payload.user_id).toBe("u1");
    expect(payload.date_local).toBe("2026-03-13");
    expect(payload.plan_json.training_plan.focus).toBe("Lower Body Strength");
    expect(payload.plan_json.training_plan.exercises[0]).toEqual(
      expect.objectContaining({
        name: "Back Squat",
        sets: 4,
        reps: "5",
        intensity: "RPE 8",
        rest_seconds_after_set: 120,
        target_rir: 2,
        target_load_kg: 102.5,
        progression_note: "Add 2.5 kg next week if bar speed stays crisp.",
        walkthrough_steps: expect.any(Array),
        coaching_points: expect.any(Array),
        setup_checklist: expect.any(Array),
        common_mistakes: expect.any(Array),
      })
    );
    expect(
      payload.plan_json.training_plan.exercises[0].video_url ||
      payload.plan_json.training_plan.exercises[0].image_url
    ).toBeTruthy();
  });

  afterEach(() => {
    process.env.OPENROUTER_API_KEY = originalEnv;
    process.env.ALLOW_DEV_ANON_AI = originalAllowAnon;
  });
});
