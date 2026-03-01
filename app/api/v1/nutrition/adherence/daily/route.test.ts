/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("POST /api/v1/nutrition/adherence/daily", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires auth", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const res = await POST(new Request("http://localhost/api/v1/nutrition/adherence/daily", { method: "POST" }));
    expect(res.status).toBe(401);
  });

  it("computes and stores daily adherence", async () => {
    const targetChain = {
      select: vi.fn(() => targetChain),
      eq: vi.fn(() => targetChain),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          calorie_target: 2200,
          protein_target_g: 160,
          carbs_target_g: 220,
          fat_target_g: 70,
          meal_timing: [{ label: "Breakfast" }, { label: "Dinner" }],
        },
        error: null,
      }),
    };

    const logChain = {
      select: vi.fn(() => logChain),
      eq: vi.fn(() => logChain),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          total_calories: 2100,
          meals: [
            { macros: { protein: 80, carbs: 100, fat: 30 } },
            { macros: { protein: 75, carbs: 120, fat: 40 } },
          ],
        },
        error: null,
      }),
    };

    const adherenceUpsert = vi.fn().mockResolvedValue({ error: null });

    const from = vi.fn((table: string) => {
      if (table === "nutrition_targets") return targetChain;
      if (table === "nutrition_logs") return logChain;
      if (table === "nutrition_adherence_daily") return { upsert: adherenceUpsert };
      return {};
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from,
    } as any);

    const res = await POST(
      new Request("http://localhost/api/v1/nutrition/adherence/daily?date=2026-03-01", {
        method: "POST",
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.total_score).toBe("number");
    expect(adherenceUpsert).toHaveBeenCalledTimes(1);
  });
});
