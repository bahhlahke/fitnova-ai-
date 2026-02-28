/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { createClient } from "@/lib/supabase/server";
import { callModel } from "@/lib/ai/model";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/ai/model", () => ({
  callModel: vi.fn(),
}));

describe("POST /api/v1/ai/analyze-meal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const req = new Request("http://localhost/api/v1/ai/analyze-meal", {
      method: "POST",
      body: JSON.stringify({ type: "text", description: "eggs" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("validates the request shape", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    } as any);

    const req = new Request("http://localhost/api/v1/ai/analyze-meal", {
      method: "POST",
      body: JSON.stringify({ type: "text", description: "x" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns a sanitized estimate", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    } as any);

    vi.mocked(callModel).mockResolvedValue({
      content: JSON.stringify({
        name: "Eggs and toast",
        calories: 410.4,
        protein: 23.8,
        carbs: 31.2,
        fat: 18.7,
        confidence: "high",
        notes: "Portion size estimated from description.",
      }),
    });

    const req = new Request("http://localhost/api/v1/ai/analyze-meal", {
      method: "POST",
      body: JSON.stringify({ type: "text", description: "3 eggs and toast" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.estimate).toEqual({
      name: "Eggs and toast",
      calories: 410,
      protein: 24,
      carbs: 31,
      fat: 19,
      confidence: "high",
      notes: "Portion size estimated from description.",
    });
  });
});
