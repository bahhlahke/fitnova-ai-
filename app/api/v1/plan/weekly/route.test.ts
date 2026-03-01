/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { createClient } from "@/lib/supabase/server";
import { composeWeeklyPlan } from "@/lib/plan/compose-weekly-plan";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/plan/compose-weekly-plan", () => ({
  composeWeeklyPlan: vi.fn(),
}));

describe("weekly plan route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET requires authentication", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const res = await GET(new Request("http://localhost/api/v1/plan/weekly"));
    expect(res.status).toBe(401);
  });

  it("POST generates and persists weekly plan", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === "weekly_plans") {
        return { upsert };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      };
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from,
    } as any);

    vi.mocked(composeWeeklyPlan).mockResolvedValue({
      week_start_local: "2026-03-02",
      cycle_goal: "General fitness",
      adaptation_summary: "summary",
      days: [],
    } as any);

    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.plan.cycle_goal).toBe("General fitness");
    expect(upsert).toHaveBeenCalledTimes(1);
  });
});
