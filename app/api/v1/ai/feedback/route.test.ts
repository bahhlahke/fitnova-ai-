/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("POST /api/v1/ai/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires auth", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const req = new Request("http://localhost/api/v1/ai/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: "nutrition", output_id: "o1", predicted_confidence: 0.7, user_rating: 3 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("validates request payload", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    } as any);

    const req = new Request("http://localhost/api/v1/ai/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: "nutrition", output_id: "", predicted_confidence: 2, user_rating: 9 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("stores feedback and returns calibration metadata", async () => {
    const from = vi.fn((table: string) => {
      if (table === "ai_feedback") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      if (table === "ai_calibration_profiles") {
        const readChain = {
          select: vi.fn(() => readChain),
          eq: vi.fn(() => readChain),
          maybeSingle: vi.fn().mockResolvedValue({ data: { sample_count: 2, avg_user_rating: 3.5, avg_correction_delta: 10, confidence_bias: 0.05, calibration_version: 7 }, error: null }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
        };
        return readChain;
      }
      return {};
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from,
    } as any);

    const req = new Request("http://localhost/api/v1/ai/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: "nutrition", output_id: "meal-123", predicted_confidence: 0.8, user_rating: 4, correction_delta: 40 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.calibration.calibration_version).toBe(8);
  });
});
