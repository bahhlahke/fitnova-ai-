/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { exchangeWhoopCode } from "@/lib/integrations/whoop-client";

const { mockSupabaseAdmin } = vi.hoisted(() => ({
  mockSupabaseAdmin: { from: vi.fn() },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabaseAdmin),
}));

vi.mock("@/lib/integrations/whoop-client", () => ({
  exchangeWhoopCode: vi.fn(),
}));

describe("GET /api/v1/integrations/whoop/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
  });

  it("redirects to error when code/state is missing", async () => {
    const res = await GET(new Request("http://localhost:3000/api/v1/integrations/whoop/callback"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/settings?whoop=error");
  });

  it("exchanges code and redirects to connected", async () => {
    vi.mocked(exchangeWhoopCode).mockResolvedValue({
      access_token: "access",
      refresh_token: "refresh",
      expires_in: 3600,
    });

    mockSupabaseAdmin.from.mockImplementation((table: string) => {
      if (table === "connected_accounts") {
        const readChain = {
          select: vi.fn(() => readChain),
          eq: vi.fn(() => readChain),
          maybeSingle: vi.fn().mockResolvedValue({ data: { metadata: { oauth_state: "u1:nonce" } }, error: null }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
        };
        return readChain;
      }
      return {};
    });

    const res = await GET(
      new Request("http://localhost:3000/api/v1/integrations/whoop/callback?code=abc&state=u1:nonce")
    );

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/settings?whoop=connected");
  });
});
