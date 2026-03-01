/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("/api/v1/nutrition/targets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET requires auth", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns active target", async () => {
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle: vi.fn().mockResolvedValue({ data: { target_id: "t1", calorie_target: 2200 }, error: null }),
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from: vi.fn(() => chain),
    } as any);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.target.target_id).toBe("t1");
  });

  it("POST saves target", async () => {
    const readChain = {
      select: vi.fn(() => readChain),
      eq: vi.fn(() => readChain),
      maybeSingle: vi.fn().mockResolvedValue({ data: { target_id: "t1", calorie_target: 2100 }, error: null }),
    };

    const from = vi.fn((table: string) => {
      if (table === "nutrition_targets") {
        return {
          upsert: vi.fn().mockResolvedValue({ error: null }),
          ...readChain,
        };
      }
      return {};
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from,
    } as any);

    const res = await POST(
      new Request("http://localhost/api/v1/nutrition/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calorie_target: 2100, protein_target_g: 160, meal_timing: [{ label: "Breakfast" }] }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.target.target_id).toBe("t1");
  });
});
