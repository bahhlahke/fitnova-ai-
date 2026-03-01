/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("GET /api/v1/coach/escalate/active", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires auth", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns null when no active escalation exists", async () => {
    const escalationChain = {
      select: vi.fn(() => escalationChain),
      eq: vi.fn(() => escalationChain),
      in: vi.fn(() => escalationChain),
      order: vi.fn(() => escalationChain),
      limit: vi.fn(() => escalationChain),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from: vi.fn(() => escalationChain),
    } as any);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.active).toBeNull();
  });

  it("returns active escalation with latest message", async () => {
    const from = vi.fn((table: string) => {
      if (table === "coach_escalations") {
        const chain = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          in: vi.fn(() => chain),
          order: vi.fn(() => chain),
          limit: vi.fn(() => chain),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              escalation_id: "e1",
              topic: "Need coach help",
              urgency: "high",
              status: "open",
              created_at: "2026-03-01T00:00:00Z",
            },
            error: null,
          }),
        };
        return chain;
      }

      if (table === "coach_escalation_messages") {
        const chain = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          order: vi.fn(() => chain),
          limit: vi.fn(() => chain),
          maybeSingle: vi.fn().mockResolvedValue({ data: { body: "Coach here", sender_type: "coach" }, error: null }),
        };
        return chain;
      }

      return {};
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from,
    } as any);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.active.escalation_id).toBe("e1");
    expect(body.active.latest_message.body).toBe("Coach here");
  });
});
