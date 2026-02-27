import { describe, it, expect, vi, beforeEach } from "vitest";
import { runDailyBriefing } from "./daily-checkin";

const { mockCreateMessage, mockSupabaseAdmin } = vi.hoisted(() => ({
    mockCreateMessage: vi.fn(),
    mockSupabaseAdmin: { from: vi.fn() },
}));

vi.mock("twilio", () => {
    return {
        default: vi.fn(() => ({
            messages: {
                create: mockCreateMessage,
            },
        })),
    };
});

vi.mock("@supabase/supabase-js", () => ({
    createClient: vi.fn(() => mockSupabaseAdmin),
}));

describe("Daily Briefing Cron Job", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetAllMocks();
        process.env.TWILIO_ACCOUNT_SID = "sid";
        process.env.TWILIO_AUTH_TOKEN = "tok";
        process.env.TWILIO_PHONE_NUMBER = "123";
    });

    it("exits early if missing Twilio credentials", async () => {
        process.env.TWILIO_ACCOUNT_SID = "";
        await runDailyBriefing();
        expect(mockSupabaseAdmin.from).not.toHaveBeenCalled();
    });

    it("fetches pro users and sends SMS briefings", async () => {
        const mockUsers = [
            { user_id: "u1", phone_number: "+111", subscription_status: "pro" },
        ];

        mockSupabaseAdmin.from.mockImplementation((table: string) => {
            if (table === "user_profile") {
                return {
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            not: vi.fn().mockResolvedValue({ data: mockUsers, error: null }),
                        }),
                    }),
                };
            }
            if (table === "daily_plans") {
                return {
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                maybeSingle: vi.fn().mockResolvedValue({
                                    data: {
                                        plan_json: {
                                            training_plan: { focus: "Legs" },
                                            nutrition_plan: { calorie_target: 2500 },
                                        },
                                    },
                                }),
                            }),
                        }),
                    }),
                };
            }
            return {};
        });

        await runDailyBriefing();

        expect(mockCreateMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                to: "+111",
                body: expect.stringContaining("Legs"),
            })
        );
    });
});
