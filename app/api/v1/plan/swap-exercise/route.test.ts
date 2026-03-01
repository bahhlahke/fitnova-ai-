/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("swap-exercise route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns validation error when missing currentExercise", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    } as any);

    const res = await POST(
      new Request("http://localhost/api/v1/plan/swap-exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    );

    expect(res.status).toBe(400);
  });

  it("returns a replacement exercise", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    } as any);

    const res = await POST(
      new Request("http://localhost/api/v1/plan/swap-exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentExercise: "Back Squat", reason: "knee pain" }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.replacement?.name).toBeTruthy();
    expect(body.reliability?.confidence_score).toBeGreaterThan(0);
  });
});
