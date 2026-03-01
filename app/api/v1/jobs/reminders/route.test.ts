/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { runReminderDispatch } from "@/lib/jobs/reminder-dispatch";

vi.mock("@/lib/jobs/reminder-dispatch", () => ({
  runReminderDispatch: vi.fn(),
}));

describe("reminder job route", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "secret";
  });

  it("rejects unauthorized requests when secret is configured", async () => {
    const res = await POST(new Request("http://localhost/api/v1/jobs/reminders", { method: "POST" }));
    expect(res.status).toBe(401);
  });

  it("runs dispatch for authorized requests", async () => {
    vi.mocked(runReminderDispatch).mockResolvedValue({ processed: 2, nudges_created: 1, sms_sent: 0, date_local: "2026-03-01" });

    const res = await POST(
      new Request("http://localhost/api/v1/jobs/reminders", {
        method: "POST",
        headers: { "x-cron-secret": "secret" },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.result.processed).toBe(2);
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });
});
