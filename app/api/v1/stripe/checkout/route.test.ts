import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import * as serverLib from "@/lib/supabase/server";

const { mockCreateSession } = vi.hoisted(() => ({
    mockCreateSession: vi.fn()
}));

vi.mock("stripe", () => {
    return {
        default: class Stripe {
            checkout = {
                sessions: {
                    create: mockCreateSession,
                },
            };
        },
    };
});

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

describe("POST /api/v1/stripe/checkout", () => {
    const originalStripeSecret = process.env.STRIPE_SECRET_KEY;

    beforeEach(() => {
        vi.resetAllMocks();
        process.env.STRIPE_SECRET_KEY = "sk_test_123";
    });

    it("returns 503 when billing is not configured", async () => {
        delete process.env.STRIPE_SECRET_KEY;

        const req = new Request("http://localhost/api/v1/stripe/checkout", { method: "POST" });
        const res = await POST(req);

        expect(res.status).toBe(503);
    });

    it("requires authentication", async () => {
        vi.mocked(serverLib.createClient).mockResolvedValue({
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
        } as any);

        const req = new Request("http://localhost/api/v1/stripe/checkout", { method: "POST" });
        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("creates a checkout session and returns url", async () => {
        const mockUser = { id: "test-user-123", email: "test@example.com" };
        vi.mocked(serverLib.createClient).mockResolvedValue({
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
        } as any);

        mockCreateSession.mockResolvedValue({ url: "https://checkout.stripe.com/testurl" });

        const req = new Request("http://localhost/api/v1/stripe/checkout", { method: "POST" });
        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.url).toBe("https://checkout.stripe.com/testurl");
        expect(mockCreateSession).toHaveBeenCalledWith(
            expect.objectContaining({
                client_reference_id: "test-user-123",
                customer_email: "test@example.com",
            })
        );
    });

    afterEach(() => {
        process.env.STRIPE_SECRET_KEY = originalStripeSecret;
    });
});
