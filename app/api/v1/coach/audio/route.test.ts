/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("POST /api/v1/coach/audio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
  });

  it("requires authentication", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const response = await POST(
      new Request("http://localhost/api/v1/coach/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: "start_set" }),
      })
    );

    expect(response.status).toBe(401);
  });

  it("returns a rich fallback coaching script when TTS is unavailable", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    } as any);

    const response = await POST(
      new Request("http://localhost/api/v1/coach/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: "start_set",
          details: {
            name: "Back Squat",
            reps: "5",
            intensity: "RPE 8",
            setup_checklist: ["Brace hard before you unlock the knees."],
            walkthrough_steps: ["Sit straight down between the heels.", "Drive through the floor and finish tall."],
            coaching_points: ["Keep the ribcage stacked over the pelvis."],
            common_mistakes: ["Letting the chest drop before the hips rise."],
            rest_seconds_after_set: 120,
            setIndex: 2,
            totalSets: 4,
            focus: "Lower body strength",
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.script).toContain("set 2 of 4");
    expect(body.script).toContain("Back Squat");
    expect(body.script).toContain("Brace hard before you unlock the knees.");
    expect(body.script).toContain("Drive through the floor and finish tall.");
    expect(body.script).toContain("Keep the ribcage stacked over the pelvis.");
    expect(body.script).toContain("Letting the chest drop before the hips rise.");
  });

  it("uses exercise-specific rest timing in the finish-set script", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    } as any);

    const response = await POST(
      new Request("http://localhost/api/v1/coach/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: "finish_set",
          details: {
            name: "Romanian Deadlift",
            rest_seconds_after_set: 105,
            setIndex: 1,
            totalSets: 3,
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.script).toContain("105 seconds");
    expect(body.script).toContain("Romanian Deadlift");
  });
});
