/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.reject(new Error("no cookie in test"))),
}));

describe("POST /api/v1/ai/respond", () => {
  const originalEnv = process.env.OPENROUTER_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.OPENROUTER_API_KEY = originalEnv;
  });

  it("returns 400 when body is not valid JSON", async () => {
    const req = new Request("http://localhost/api/v1/ai/respond", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid|required/i);
  });

  it("returns 400 when message is missing", async () => {
    const req = new Request("http://localhost/api/v1/ai/respond", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/message/i);
  });

  it("returns 400 when message is empty string", async () => {
    const req = new Request("http://localhost/api/v1/ai/respond", {
      method: "POST",
      body: JSON.stringify({ message: "   " }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 503 when OPENROUTER_API_KEY is not set", async () => {
    process.env.OPENROUTER_API_KEY = "";
    const req = new Request("http://localhost/api/v1/ai/respond", {
      method: "POST",
      body: JSON.stringify({ message: "Hello" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toMatch(/openrouter|key|configured/i);
  });

  it("returns 200 and reply when key is set and OpenRouter returns success", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    const mockReply = "Here is some coach advice.";
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content: mockReply } }],
            }),
        } as Response)
      )
    );

    const req = new Request("http://localhost/api/v1/ai/respond", {
      method: "POST",
      body: JSON.stringify({ message: "How do I get stronger?" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reply).toBe(mockReply);
  });
});
