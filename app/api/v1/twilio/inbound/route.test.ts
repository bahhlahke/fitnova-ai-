import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import * as aiModel from "@/lib/ai/model";

const { mockAssembleContext, mockSupabaseAdmin } = vi.hoisted(() => ({
    mockAssembleContext: vi.fn(),
    mockSupabaseAdmin: { from: vi.fn() }
}));

vi.mock("@/lib/ai/assemble-context", () => ({
    assembleContext: mockAssembleContext,
}));

vi.mock("@/lib/ai/model", () => ({
    callModel: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
    createClient: vi.fn(() => mockSupabaseAdmin),
}));

describe("POST /api/v1/twilio/inbound", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it("handles missing body or sender gracefully", async () => {
        const req = new Request("http://localhost", {
            method: "POST",
            body: "Foo=Bar",
        });
        const res = await POST(req);
        const text = await res.text();
        expect(res.status).toBe(200);
        expect(text).toContain("Error: Missing body or sender info");
    });

    it("returns error message if phone number is not found", async () => {
        mockSupabaseAdmin.from.mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                }),
            }),
        });

        const req = new Request("http://localhost", {
            method: "POST",
            body: "From=+123456789&Body=Hello",
        });

        const res = await POST(req);
        const text = await res.text();
        expect(res.status).toBe(200);
        expect(text).toContain("Sorry, I don't recognize this number");
    });

    it("processes inbound text and replies via AI model", async () => {
        mockSupabaseAdmin.from.mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: "u1" } }),
                }),
            }),
        });

        mockAssembleContext.mockResolvedValue({ systemPrompt: "Context assembled" });
        vi.mocked(aiModel.callModel).mockResolvedValue("Hey! Ready for leg day.");

        const req = new Request("http://localhost", {
            method: "POST",
            body: "From=+123456789&Body=Ready",
        });

        const res = await POST(req);
        const text = await res.text();

        expect(res.status).toBe(200);
        expect(text).toContain("Hey! Ready for leg day.");
        expect(aiModel.callModel).toHaveBeenCalledWith(
            expect.objectContaining({
                maxTokens: 150,
            })
        );
    });
});
