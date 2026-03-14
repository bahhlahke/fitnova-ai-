import { describe, it, expect, vi } from "vitest";
import { POST } from "./route";
import { runSitBacktest } from "@/lib/jobs/sit-backtest";

vi.mock("@/lib/jobs/sit-backtest", () => ({
  runSitBacktest: vi.fn(),
}));

describe("POST /api/v1/jobs/sit/backtest", () => {
  it("blocks unauthorized calls when cron secret is set", async () => {
    process.env.CRON_SECRET = "secret";
    const res = await POST(new Request("http://localhost/api/v1/jobs/sit/backtest", { method: "POST" }));
    expect(res.status).toBe(401);
  });

  it("returns summary for authorized calls", async () => {
    process.env.CRON_SECRET = "secret";
    vi.mocked(runSitBacktest).mockResolvedValue({
      sampled_users: 2,
      timelines_scanned: 40,
      red_days: 8,
      amber_days: 14,
      green_days: 18,
      generated_at: "2026-03-10T00:00:00.000Z",
    });

    const res = await POST(
      new Request("http://localhost/api/v1/jobs/sit/backtest", {
        method: "POST",
        headers: { "x-cron-key": "secret" },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary.timelines_scanned).toBe(40);
  });
});
