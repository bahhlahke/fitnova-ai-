import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });
    const mockConstructEvent = vi.fn();

    return { mockEq, mockUpdate, mockFrom, mockConstructEvent };
});

vi.mock("stripe", () => {
    return {
        default: class Stripe {
            webhooks = {
                constructEvent: mocks.mockConstructEvent,
            };
        },
    };
});

vi.mock("@supabase/supabase-js", () => ({
    createClient: vi.fn(() => ({
        from: mocks.mockFrom,
    })),
}));

import { POST } from "./route";

describe("POST /api/v1/stripe/webhook", () => {
    const originalStripeSecret = process.env.STRIPE_SECRET_KEY;
    const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.STRIPE_SECRET_KEY = "sk_test_123";
        process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_123";
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
        process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    });

    it("returns 400 on missing signature", async () => {
        const req = new Request("http://localhost/api/v1/stripe/webhook", {
            method: "POST",
            body: "test-body",
        });

        mocks.mockConstructEvent.mockImplementation(() => {
            throw new Error("Missing signature");
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it("updates user to pro on checkout session completion", async () => {
        const req = new Request("http://localhost/api/v1/stripe/webhook", {
            method: "POST",
            headers: { "Stripe-Signature": "valid" },
            body: "test-body",
        });

        mocks.mockConstructEvent.mockReturnValue({
            type: "checkout.session.completed",
            data: {
                object: {
                    client_reference_id: "test-user-123",
                    payment_status: "paid",
                },
            },
        });

        mocks.mockFrom.mockReturnValue({ update: mocks.mockUpdate });
        mocks.mockUpdate.mockReturnValue({ eq: mocks.mockEq });

        const res = await POST(req);
        expect(res.status).toBe(200);
    });

    afterEach(() => {
        process.env.STRIPE_SECRET_KEY = originalStripeSecret;
        process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret;
        process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
        process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
    });
});
