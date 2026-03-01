/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/coach/authorization", () => ({
  isCoachAdmin: vi.fn((userId: string) => userId === "coach1"),
}));

describe("POST /api/v1/admin/coach/escalations/:id/reply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates message body", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "coach1" } } }) },
    } as any);

    const res = await POST(
      new Request("http://localhost/api/v1/admin/coach/escalations/e1/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "" }),
      })
    );

    expect(res.status).toBe(400);
  });

  it("posts coach reply", async () => {
    const from = vi.fn((table: string) => {
      if (table === "coach_escalations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { escalation_id: "e1", user_id: "u1", status: "open" }, error: null }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      if (table === "coach_escalation_messages") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { escalation_message_id: "m1", body: "We got you" }, error: null }),
            }),
          }),
        };
      }
      if (table === "coach_escalation_events") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {};
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "coach1" } } }) },
      from,
    } as any);

    const res = await POST(
      new Request("http://localhost/api/v1/admin/coach/escalations/e1/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "We got you" }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message.escalation_message_id).toBe("m1");
  });
});
