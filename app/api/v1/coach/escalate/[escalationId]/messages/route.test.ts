/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/coach/authorization", () => ({
  isCoachAdmin: vi.fn(() => false),
}));

describe("/api/v1/coach/escalate/:id/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET requires auth", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const res = await GET(new Request("http://localhost/api/v1/coach/escalate/e1/messages"));
    expect(res.status).toBe(401);
  });

  it("GET returns ordered thread for owner", async () => {
    const from = vi.fn((table: string) => {
      if (table === "coach_escalations") {
        const chain = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          maybeSingle: vi.fn().mockResolvedValue({ data: { escalation_id: "e1", user_id: "u1", status: "open" }, error: null }),
        };
        return chain;
      }

      if (table === "coach_escalation_messages") {
        const chain = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          order: vi.fn(() => chain),
        };
        return { ...chain, data: [{ body: "First" }] } as any;
      }

      return {};
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from,
    } as any);

    const res = await GET(new Request("http://localhost/api/v1/coach/escalate/e1/messages"));
    expect(res.status).toBe(200);
  });

  it("POST validates message", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    } as any);

    const res = await POST(
      new Request("http://localhost/api/v1/coach/escalate/e1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "" }),
      })
    );

    expect(res.status).toBe(400);
  });
});
