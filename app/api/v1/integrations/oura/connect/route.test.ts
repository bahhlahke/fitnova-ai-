import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

const getUser = vi.fn();
const upsert = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser },
    from: () => ({ upsert }),
  }),
}));

vi.mock("@/lib/integrations/oura-client", () => ({
  buildOuraAuthorizeUrl: (state: string) => `https://oura.example/auth?state=${state}`,
}));

describe("GET /api/v1/integrations/oura/connect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsert.mockResolvedValue({ error: null });
  });

  it("returns 401 for anonymous users", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns connect_url and stores oauth state", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.provider).toBe("oura");
    expect(body.connect_url).toContain("https://oura.example/auth?state=");
    expect(upsert).toHaveBeenCalledTimes(1);
  });
});
