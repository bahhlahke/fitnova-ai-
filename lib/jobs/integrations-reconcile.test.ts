/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runIntegrationsReconciliation } from "./integrations-reconcile";
import { persistOpenWearablesPayload } from "@/lib/integrations/open-wearables";

const selectBuilders = {
  connectedSignals: vi.fn(),
  replayQueue: vi.fn(),
};
const update = vi.fn();
const insert = vi.fn();

vi.mock("@/lib/integrations/open-wearables", () => ({
  persistOpenWearablesPayload: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === "connected_signals") {
        return {
          select: (...args: unknown[]) => selectBuilders.connectedSignals(...args),
        };
      }
      if (table === "wearable_webhook_replay_queue") {
        return {
          select: (...args: unknown[]) => selectBuilders.replayQueue(...args),
          update,
        };
      }
      if (table === "wearable_reconciliation_runs") {
        return { insert };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  })),
}));

describe("runIntegrationsReconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectBuilders.connectedSignals.mockReturnValue({
      gte: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: [{ provider: "whoop", signal_date: "2026-03-10" }],
          error: null,
        }),
      }),
    });
    selectBuilders.replayQueue.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: [
            { id: "r1", payload: { event_type: "activity", user_id: "u1", provider: "whoop", data: [{ steps: 1000 }] } },
            { id: "r2", payload: { event_type: "activity", user_id: "u1", provider: "whoop", data: [{ steps: 2000 }] } },
          ],
          error: null,
        }),
      }),
    });
    update.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    insert.mockResolvedValue({ error: null });
  });

  it("replays pending payloads and records success/failure counts", async () => {
    vi.mocked(persistOpenWearablesPayload)
      .mockResolvedValueOnce({ processed: 1, skipped: 0 })
      .mockRejectedValueOnce(new Error("bad payload"));

    const summary = await runIntegrationsReconciliation();

    expect(persistOpenWearablesPayload).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledTimes(2);
    expect(summary.pending_replays).toBe(2);
    expect(summary.processed_replays).toBe(1);
    expect(summary.failed_replays).toBe(1);
  });
});
