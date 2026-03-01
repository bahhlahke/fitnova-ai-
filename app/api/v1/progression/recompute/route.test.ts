/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { createClient } from "@/lib/supabase/server";
import { recomputeProgressionSnapshots } from "@/lib/progression/targets";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/progression/targets", () => ({
  recomputeProgressionSnapshots: vi.fn(),
}));

describe("POST /api/v1/progression/recompute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires auth", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns recomputed snapshots", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    } as any);

    vi.mocked(recomputeProgressionSnapshots).mockResolvedValue([
      { exercise_name: "Back Squat", e1rm: 120, total_volume: 500, trend_score: 0.02, last_performed_date: "2026-02-28", sample_size: 8 },
    ] as any);

    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.snapshot_count).toBe(1);
  });
});
