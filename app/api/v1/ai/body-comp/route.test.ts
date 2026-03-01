import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";

// Hoisted mocks for vi.mock
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

vi.mock("@/lib/ai/model", () => ({
    callModel: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { callModel } from "@/lib/ai/model";

describe("POST /api/v1/ai/body-comp", () => {
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user_123" } } }),
            },
            from: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({ data: null }), // By default, no existing record today
                insert: vi.fn().mockResolvedValue({ error: null }),
                update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("returns 401 when user is not authenticated", async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

        const req = new Request("http://localhost/api/v1/ai/body-comp", {
            method: "POST",
            body: JSON.stringify({ images: { front: "base64", side: "base64", back: "base64" } }),
        });

        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it("returns 400 when no image is provided", async () => {
        const req = new Request("http://localhost/api/v1/ai/body-comp", {
            method: "POST",
            body: JSON.stringify({}),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it("returns 500 when AI model returns invalid JSON", async () => {
        vi.mocked(callModel).mockResolvedValue({
            content: "I'm sorry, I cannot process this image.", // Non-JSON string
        });

        const req = new Request("http://localhost/api/v1/ai/body-comp", {
            method: "POST",
            body: JSON.stringify({ images: { front: "data:image/png;base64,1", side: "2", back: "3" } }),
        });

        const res = await POST(req);
        expect(res.status).toBe(500);
        const data = await res.json();
        expect(data.error).toBe("Failed to parse AI response into JSON.");
    });

    it("processes valid image, returns JSON, and inserts into progress_tracking", async () => {
        const mockVisionResponse = {
            body_fat_percent: 14.5,
            analysis: "Clear abdominal definition present, estimating low teens.",
        };

        vi.mocked(callModel).mockResolvedValue({
            content: JSON.stringify(mockVisionResponse),
        });

        const req = new Request("http://localhost/api/v1/ai/body-comp", {
            method: "POST",
            body: JSON.stringify({
                images: { front: "base64_front", side: "base64_side", back: "base64_back" },
                localDate: "2026-02-28",
            }),
        });

        const res = await POST(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.body_fat_percent).toBe(14.5);
        expect(data.analysis).toBe("Clear abdominal definition present, estimating low teens.");

        // Verify insertion logic
        expect(mockSupabase.from).toHaveBeenCalledWith("progress_tracking");
        expect(mockSupabase.from().insert).toHaveBeenCalledWith({
            user_id: "user_123",
            date: "2026-02-28",
            body_fat_percent: 14.5,
            measurements: {},
            notes: "Logged via AI Body Comp Scanner",
        });
    });

    it("updates existing record if user already checked in today", async () => {
        // Stage existing record
        mockSupabase.from().maybeSingle.mockResolvedValue({ data: { track_id: "record_555" } });
        const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
        mockSupabase.from().update.mockReturnValue({ eq: mockUpdateEq });

        const mockVisionResponse = {
            body_fat_percent: 18.2,
            analysis: "Moderate definition.",
        };

        vi.mocked(callModel).mockResolvedValue({
            content: JSON.stringify(mockVisionResponse),
        });

        const req = new Request("http://localhost/api/v1/ai/body-comp", {
            method: "POST",
            body: JSON.stringify({ images: { front: "base64", side: "base64", back: "base64" } }),
        });

        const res = await POST(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.body_fat_percent).toBe(18.2);

        // Verify update logic (instead of insert)
        expect(mockSupabase.from).toHaveBeenCalledWith("progress_tracking");
        expect(mockSupabase.from().update).toHaveBeenCalledWith({
            body_fat_percent: 18.2,
            notes: "Logged via AI Body Comp Scanner",
        });
        expect(mockUpdateEq).toHaveBeenCalledWith("track_id", "record_555");
        // Ensure insert wasn't called
        expect(mockSupabase.from().insert).not.toHaveBeenCalled();
    });
});
