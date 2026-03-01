/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("retention-risk route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns risk payload for authenticated user", async () => {
    const from = vi.fn((table: string) => {
      if (table === "coach_nudges") {
        return { upsert: vi.fn().mockResolvedValue({ error: null }) };
      }
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        maybeSingle: vi.fn(async () => {
          if (table === "daily_plans") return { data: null };
          if (table === "workout_logs") return { data: { date: "2026-02-25" } };
          if (table === "nutrition_logs") return { data: { date: "2026-02-26" } };
          if (table === "progress_tracking") return { data: { date: "2026-02-20" } };
          if (table === "check_ins") return { data: { date_local: "2026-02-25" } };
          return { data: null };
        }),
      };
      return chain;
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from,
    } as any);

    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.risk_score).toBe("number");
    expect(["low", "medium", "high"]).toContain(body.risk_level);
    expect(typeof body.recommended_action).toBe("string");
  });
});
