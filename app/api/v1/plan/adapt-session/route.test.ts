/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { createClient } from "@/lib/supabase/server";
import { adaptSession } from "@/lib/plan/adapt-session";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/plan/adapt-session", () => ({
  adaptSession: vi.fn(),
}));

describe("POST /api/v1/plan/adapt-session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const req = new Request("http://localhost/api/v1/plan/adapt-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_exercises: [{ name: "Back Squat", sets: 4, reps: "6", intensity: "RPE 7" }] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("validates current_exercises", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    } as any);

    const req = new Request("http://localhost/api/v1/plan/adapt-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns adapted exercises", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    } as any);

    vi.mocked(adaptSession).mockReturnValue({
      exercises: [{ name: "Goblet Squat", sets: 3, reps: "8", intensity: "RPE 6" }],
      rationale: "Adapted for constraints.",
      reliability: { confidence_score: 0.8, explanation: "rule", limitations: [] },
    } as any);

    const req = new Request("http://localhost/api/v1/plan/adapt-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        minutes_available: 25,
        equipment_mode: "limited",
        intensity_preference: "downshift",
        current_exercises: [{ name: "Back Squat", sets: 4, reps: "6", intensity: "RPE 7" }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.exercises[0].name).toBe("Goblet Squat");
  });
});
