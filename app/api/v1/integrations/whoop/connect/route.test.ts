/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { createClient } from "@/lib/supabase/server";
import { buildWhoopAuthorizeUrl } from "@/lib/integrations/whoop-client";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/integrations/whoop-client", () => ({
  buildWhoopAuthorizeUrl: vi.fn(),
}));

describe("GET /api/v1/integrations/whoop/connect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns connect url", async () => {
    vi.mocked(buildWhoopAuthorizeUrl).mockReturnValue("https://whoop.example/auth");

    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ upsert }));

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from,
    } as any);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.connect_url).toBe("https://whoop.example/auth");
    expect(typeof body.state).toBe("string");
  });
});
