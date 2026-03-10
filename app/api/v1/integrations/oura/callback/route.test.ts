import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { exchangeOuraCode } from "@/lib/integrations/oura-client";

const maybeSingle = vi.fn();
const upsert = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle }),
        }),
      }),
      upsert,
    }),
  }),
}));

vi.mock("@/lib/integrations/oura-client", () => ({
  exchangeOuraCode: vi.fn(),
}));

describe("GET /api/v1/integrations/oura/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingle.mockResolvedValue({ data: { metadata: { oauth_state: "u1:nonce" } }, error: null });
    upsert.mockResolvedValue({ error: null });
    vi.mocked(exchangeOuraCode).mockResolvedValue({
      access_token: "token",
      refresh_token: "refresh",
      expires_in: 3600,
    });
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
  });

  it("redirects error when code/state missing", async () => {
    const res = await GET(new Request("http://localhost:3000/api/v1/integrations/oura/callback"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/settings?oura=error");
  });

  it("persists credentials and redirects connected", async () => {
    const res = await GET(
      new Request("http://localhost:3000/api/v1/integrations/oura/callback?code=abc&state=u1:nonce")
    );

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/settings?oura=connected");
    expect(exchangeOuraCode).toHaveBeenCalledWith("abc");
    expect(upsert).toHaveBeenCalledTimes(1);
  });
});
