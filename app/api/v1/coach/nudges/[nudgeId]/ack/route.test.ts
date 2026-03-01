/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("POST /api/v1/coach/nudges/:id/ack", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires auth", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const res = await POST(new Request("http://localhost/api/v1/coach/nudges/n1/ack", { method: "POST" }));
    expect(res.status).toBe(401);
  });

  it("rejects when nudge is owned by another user", async () => {
    const from = vi.fn((table: string) => {
      if (table === "coach_nudges") {
        const chain = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          maybeSingle: vi.fn().mockResolvedValue({ data: { nudge_id: "n1", user_id: "u2", acknowledged_at: null }, error: null }),
        };
        return chain;
      }
      return {};
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from,
    } as any);

    const res = await POST(new Request("http://localhost/api/v1/coach/nudges/n1/ack", { method: "POST" }));
    expect(res.status).toBe(403);
  });

  it("is idempotent when already acknowledged", async () => {
    const from = vi.fn((table: string) => {
      if (table === "coach_nudges") {
        const chain = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          maybeSingle: vi.fn().mockResolvedValue({ data: { nudge_id: "n1", user_id: "u1", acknowledged_at: "2026-03-01T00:00:00.000Z" }, error: null }),
        };
        return chain;
      }
      return {};
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from,
    } as any);

    const res = await POST(new Request("http://localhost/api/v1/coach/nudges/n1/ack", { method: "POST" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.idempotent).toBe(true);
  });

  it("updates acknowledged_at for owned nudge", async () => {
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: { nudge_id: "n1", user_id: "u1", acknowledged_at: null }, error: null });

    const single = vi.fn().mockResolvedValue({
      data: { nudge_id: "n1", acknowledged_at: "2026-03-01T01:00:00.000Z" },
      error: null,
    });

    const from = vi.fn((table: string) => {
      if (table === "coach_nudges") {
        const readChain = {
          select: vi.fn(() => readChain),
          eq: vi.fn(() => readChain),
          maybeSingle,
        };

        const writeChain = {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({ single })),
              })),
            })),
          })),
        };

        return {
          ...readChain,
          ...writeChain,
        };
      }
      return {};
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from,
    } as any);

    const res = await POST(new Request("http://localhost/api/v1/coach/nudges/n1/ack", { method: "POST" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.idempotent).toBe(false);
    expect(body.nudge_id).toBe("n1");
  });
});
