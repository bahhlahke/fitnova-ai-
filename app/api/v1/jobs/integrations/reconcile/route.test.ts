import { describe, it, expect, vi } from "vitest";
import { POST } from "./route";
import { runIntegrationsReconciliation } from "@/lib/jobs/integrations-reconcile";

vi.mock("@/lib/jobs/integrations-reconcile", () => ({
  runIntegrationsReconciliation: vi.fn(),
}));

describe("POST /api/v1/jobs/integrations/reconcile", () => {
  it("rejects unauthorized calls", async () => {
    process.env.CRON_SECRET = "secret";
    const res = await POST(new Request("http://localhost/api/v1/jobs/integrations/reconcile", { method: "POST" }));
    expect(res.status).toBe(401);
  });

  it("returns summary when authorized", async () => {
    process.env.CRON_SECRET = "secret";
    vi.mocked(runIntegrationsReconciliation).mockResolvedValue({
      providers_seen: ["whoop", "oura"],
      signals_last_24h: 12,
      pending_replays: 2,
      processed_replays: 2,
      generated_at: "2026-03-10T00:00:00.000Z",
    });

    const res = await POST(
      new Request("http://localhost/api/v1/jobs/integrations/reconcile", {
        method: "POST",
        headers: { "x-cron-key": "secret" },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary.providers_seen).toContain("oura");
  });
});
