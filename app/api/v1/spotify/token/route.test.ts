import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { createClient } from "@/lib/supabase/server";

const maybeSingle = vi.fn();
const select = vi.fn();
const eq = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

describe("GET /api/v1/spotify/token", () => {
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();
        
        mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({ 
                    data: { user: { id: "user-123", user_metadata: {} } }, 
                    error: null 
                }),
            },
            from: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            maybeSingle
                        })
                    })
                })
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase);
    });

    it("returns 401 if user is not authenticated", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("Unauthorized") });
        const res = await GET();
        expect(res.status).toBe(401);
    });

    it("returns token from user_metadata if present", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ 
            data: { user: { id: "user-123", user_metadata: { spotify_provider_token: "metadata-token" } } }, 
            error: null 
        });

        const res = await GET();
        const data = await res.json();

        expect(data.access_token).toBe("metadata-token");
        expect(data.token).toBe("metadata-token");
    });

    it("returns token from connected_accounts if not in metadata", async () => {
        maybeSingle.mockResolvedValue({ data: { access_token: "db-token" }, error: null });

        const res = await GET();
        const data = await res.json();

        expect(data.connected).toBe(true);
        expect(data.access_token).toBe("db-token");
        expect(data.token).toBe("db-token");
    });

    it("returns connected: false if token is missing in both", async () => {
        maybeSingle.mockResolvedValue({ data: null, error: null });

        const res = await GET();
        const data = await res.json();

        expect(data.connected).toBe(false);
        expect(data.access_token).toBe(null);
    });

    it("returns 500 if database lookup fails", async () => {
        maybeSingle.mockResolvedValue({ data: null, error: new Error("DB Error") });

        const res = await GET();
        expect(res.status).toBe(500);
    });
});
