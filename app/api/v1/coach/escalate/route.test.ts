/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("coach escalation route", () => {
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

  it("POST validates topic", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    } as any);

    const res = await POST(
      new Request("http://localhost/api/v1/coach/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ details: "Need help" }),
      })
    );

    expect(res.status).toBe(400);
  });

  it("POST stores escalation request", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { escalation_id: "e1", status: "open", created_at: "2026-03-01T00:00:00.000Z" },
      error: null,
    });

    const from = vi.fn((table: string) => {
      if (table === "coach_escalations") {
        return {
          insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single }) }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [] }),
      };
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from,
    } as any);

    const res = await POST(
      new Request("http://localhost/api/v1/coach/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: "Plan keeps aggravating shoulder", urgency: "high" }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.request.escalation_id).toBe("e1");
  });
});
