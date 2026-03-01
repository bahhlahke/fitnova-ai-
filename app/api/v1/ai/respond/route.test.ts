/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

describe("POST /api/v1/ai/respond", () => {
  const originalEnv = process.env.OPENROUTER_API_KEY;
  const originalAllowAnon = process.env.ALLOW_DEV_ANON_AI;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockSupabase.auth.getUser.mockReset();
    mockSupabase.from.mockReset();
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.ALLOW_DEV_ANON_AI = "false";
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
    expect(data.code).toBe("INVALID_JSON");
  });

  it("returns 401 when user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const req = new Request("http://localhost/api/v1/ai/respond", {
      method: "POST",
      body: JSON.stringify({ message: "hello" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.code).toBe("AUTH_REQUIRED");
  });

  it("returns 400 when message exceeds max length", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    const req = new Request("http://localhost/api/v1/ai/respond", {
      method: "POST",
      body: JSON.stringify({ message: "x".repeat(2001) }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.code).toBe("VALIDATION_ERROR");
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
    expect(data.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("returns 200 and reply when authenticated and provider succeeds", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "ai_conversations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      };
    });

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

  it("processes tool calls and logs biometrics successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    const progressInsert = vi.fn().mockResolvedValue({ error: null });
    const progressUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const progressUpdate = vi.fn().mockReturnValue({ eq: progressUpdateEq });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "progress_tracking") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: progressInsert,
          update: progressUpdate,
        };
      }

      if (table === "ai_conversations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    const mockToolCallResponse = {
      content: "",
      tool_calls: [
        {
          id: "call_123",
          type: "function",
          function: { name: "log_biometrics", arguments: JSON.stringify({ weight_lbs: 185, body_fat_percent: 12 }) }
        }
      ]
    };

    const mockFinalResponse = {
      content: "Successfully logged 185 lbs and 12% body fat.",
    };

    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                choices: [{ message: { content: "", tool_calls: mockToolCallResponse.tool_calls } }],
              }),
          } as Response)
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                choices: [{ message: { content: mockFinalResponse.content } }],
              }),
          } as Response)
        )
    );

    const req = new Request("http://localhost/api/v1/ai/respond", {
      method: "POST",
      body: JSON.stringify({
        message: "I weigh 185 lbs today at 12% BF.",
        localDate: "2026-02-28",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reply).toBe(mockFinalResponse.content);
    expect(data.actions).toEqual([
      {
        type: "biometrics_logged",
        targetRoute: "/progress",
        summary: "Progress updated",
      },
    ]);
    expect(data.refreshScopes).toEqual(
      expect.arrayContaining(["dashboard", "progress"])
    );
    expect(progressInsert).toHaveBeenCalledWith({
      user_id: "u1",
      date: "2026-02-28",
      weight: 83.9,
      body_fat_percent: 12,
      measurements: {},
      notes: "Logged via Nova AI",
    });
    expect(progressUpdate).not.toHaveBeenCalled();
  });

  afterEach(() => {
    process.env.OPENROUTER_API_KEY = originalEnv;
    process.env.ALLOW_DEV_ANON_AI = originalAllowAnon;
  });
});
