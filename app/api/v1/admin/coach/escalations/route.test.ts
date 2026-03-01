/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/coach/authorization", () => ({
  isCoachAdmin: vi.fn((userId: string) => userId === "coach1"),
}));

describe("GET /api/v1/admin/coach/escalations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires auth", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const res = await GET(new Request("http://localhost/api/v1/admin/coach/escalations"));
    expect(res.status).toBe(401);
  });

  it("requires coach admin", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    } as any);

    const res = await GET(new Request("http://localhost/api/v1/admin/coach/escalations"));
    expect(res.status).toBe(403);
  });

  it("returns queue for coach admins", async () => {
    const escalationsChain = {
      select: vi.fn(() => escalationsChain),
      order: vi.fn(() => escalationsChain),
      limit: vi.fn(() => escalationsChain),
      eq: vi.fn(() => escalationsChain),
      then: undefined,
    } as any;

    const from = vi.fn((table: string) => {
      if (table === "coach_escalations") {
        return {
          ...escalationsChain,
          then: undefined,
          [Symbol.toStringTag]: "Promise",
          async *[Symbol.asyncIterator]() {},
        } as any;
      }
      if (table === "coach_escalation_messages") {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return {};
    });

    // easier promise form for first query
    from.mockImplementationOnce(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{ escalation_id: "e1", topic: "Need help", status: "open" }],
        error: null,
      }),
      eq: vi.fn().mockReturnThis(),
    }));

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "coach1" } } }) },
      from,
    } as any);

    const res = await GET(new Request("http://localhost/api/v1/admin/coach/escalations"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.escalations)).toBe(true);
  });
});
