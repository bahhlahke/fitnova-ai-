/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { createClient } from "@/lib/supabase/server";
import { insertProductEvent } from "@/lib/telemetry/events";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/telemetry/events", () => ({
  insertProductEvent: vi.fn(),
}));

describe("POST /api/v1/telemetry/event", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates payload", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const res = await POST(
      new Request("http://localhost/api/v1/telemetry/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    );

    expect(res.status).toBe(400);
  });

  it("logs telemetry event", async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    };
    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const res = await POST(
      new Request("http://localhost/api/v1/telemetry/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_name: "adapt_session_requested", event_props: { source: "guided" } }),
      })
    );

    expect(res.status).toBe(200);
    expect(insertProductEvent).toHaveBeenCalledTimes(1);
  });
});
