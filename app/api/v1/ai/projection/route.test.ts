/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("projection route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const res = await GET(new Request("http://localhost/api/v1/ai/projection"));
    expect(res.status).toBe(401);
  });

  it("returns projection payload for authenticated user", async () => {
    const from = vi.fn((table: string) => {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        limit: vi.fn(() =>
          Promise.resolve(
            table === "progress_tracking"
              ? { data: [{ weight: 80 }, { weight: 79.5 }] }
              : table === "check_ins"
                ? { data: [{ adherence_score: 4 }, { adherence_score: 5 }] }
                : { data: [] }
          )
        ),
      };
      return chain;
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from,
    } as any);

    const res = await GET(new Request("http://localhost/api/v1/ai/projection"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.current).toBe("number");
    expect(typeof body.projected_4w).toBe("number");
    expect(typeof body.projected_12w).toBe("number");
    expect(typeof body.rate).toBe("number");
    expect(typeof body.confidence).toBe("number");
  });
});
