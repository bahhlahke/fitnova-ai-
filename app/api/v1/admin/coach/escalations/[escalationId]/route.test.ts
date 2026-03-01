/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "./route";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/coach/authorization", () => ({
  isCoachAdmin: vi.fn((userId: string) => userId === "coach1"),
}));

describe("PATCH /api/v1/admin/coach/escalations/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires auth", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const res = await PATCH(
      new Request("http://localhost/api/v1/admin/coach/escalations/e1", {
        method: "PATCH",
        body: JSON.stringify({ status: "assigned" }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("requires admin access", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    } as any);

    const res = await PATCH(
      new Request("http://localhost/api/v1/admin/coach/escalations/e1", {
        method: "PATCH",
        body: JSON.stringify({ status: "assigned" }),
      })
    );

    expect(res.status).toBe(403);
  });

  it("updates escalation status", async () => {
    const from = vi.fn((table: string) => {
      if (table === "coach_escalations") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { escalation_id: "e1", user_id: "u1", status: "assigned" },
                  error: null,
                }),
              }),
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

    const res = await PATCH(
      new Request("http://localhost/api/v1/admin/coach/escalations/e1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "assigned" }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.escalation.status).toBe("assigned");
  });
});
