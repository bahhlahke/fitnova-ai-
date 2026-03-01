/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { createClient } from "@/lib/supabase/server";
import { getNextTargets, recomputeProgressionSnapshots } from "@/lib/progression/targets";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/progression/targets", () => ({
  getNextTargets: vi.fn(),
  recomputeProgressionSnapshots: vi.fn(),
}));

describe("GET /api/v1/progression/next-targets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires auth", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const res = await GET(new Request("http://localhost/api/v1/progression/next-targets"));
    expect(res.status).toBe(401);
  });

  it("returns existing progression targets", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    } as any);

    vi.mocked(getNextTargets).mockResolvedValue([
      {
        exercise_name: "Back Squat",
        target_load_kg: 100,
        target_rir: 2,
        progression_note: "Add a small load increase.",
        e1rm: 135,
        trend_score: 0.04,
        sample_size: 10,
      },
    ] as any);

    const res = await GET(new Request("http://localhost/api/v1/progression/next-targets?exercises=Back%20Squat"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.targets).toHaveLength(1);
    expect(body.sparse_history).toBe(false);
  });

  it("recomputes snapshots when no targets exist", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    } as any);

    vi.mocked(getNextTargets)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([
        {
          exercise_name: "Bench Press",
          target_load_kg: 75,
          target_rir: 2,
          progression_note: "Maintain load and clean reps.",
          e1rm: 101,
          trend_score: 0,
          sample_size: 5,
        },
      ] as any);

    const res = await GET(new Request("http://localhost/api/v1/progression/next-targets"));
    expect(res.status).toBe(200);
    expect(recomputeProgressionSnapshots).toHaveBeenCalledTimes(1);
  });
});
