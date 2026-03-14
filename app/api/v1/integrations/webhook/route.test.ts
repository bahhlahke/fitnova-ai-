/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const signalUpsert = vi.fn();
const replayInsert = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === "connected_signals") {
        return { upsert: signalUpsert };
      }
      if (table === "wearable_webhook_replay_queue") {
        return { insert: replayInsert };
      }
      throw new Error(`Unexpected admin table ${table}`);
    },
  })),
}));

describe("POST /api/v1/integrations/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.OPEN_WEARABLES_SECRET;
    signalUpsert.mockResolvedValue({ error: null });
    replayInsert.mockResolvedValue({ error: null });
  });

  it("processes every row in a batched payload", async () => {
    const res = await POST(
      new Request("http://localhost/api/v1/integrations/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "readiness",
          user_id: "u1",
          provider: "oura",
          data: [
            { date: "2026-03-10", readiness_score: 80, hrv: 70, resting_hr: 50 },
            { date: "2026-03-09", readiness_score: 76, hrv: 66, resting_hr: 52 },
          ],
        }),
      })
    );

    expect(res.status).toBe(200);
    expect(signalUpsert).toHaveBeenCalledTimes(2);
    const body = await res.json();
    expect(body.processed).toBe(2);
    expect(body.skipped).toBe(0);
  });

  it("enqueues replay payloads when persistence fails", async () => {
    signalUpsert.mockResolvedValueOnce({ error: { message: "write failed", code: "500" } });

    const payload = {
      event_type: "activity",
      user_id: "u1",
      provider: "whoop",
      data: [{ date: "2026-03-10", steps: 9000 }],
    };

    const res = await POST(
      new Request("http://localhost/api/v1/integrations/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toBe(500);
    expect(replayInsert).toHaveBeenCalledTimes(1);
    expect(replayInsert.mock.calls[0][0]).toMatchObject({
      provider: "whoop",
      event_type: "activity",
      payload,
      status: "pending",
    });
  });
});
