/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from "vitest";
import { assembleContext } from "./assemble-context";

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
  })),
};

describe("assembleContext", () => {
  it("returns system prompt including base coach persona", async () => {
    const { systemPrompt } = await assembleContext(
      mockSupabase as never,
      "user-123"
    );
    expect(systemPrompt).toContain("fitness coach");
    expect(systemPrompt).toContain("nutritionist");
    expect(systemPrompt).toContain("Tailor workout and exercise suggestions");
  });

  it("includes user profile when present", async () => {
    const supabaseWithProfile = {
      from: vi.fn((table: string) => {
        if (table === "user_profile") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                name: "Test User",
                goals: ["weight_loss"],
                activity_level: "intermediate",
              },
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        };
      }),
    };
    const { systemPrompt } = await assembleContext(
      supabaseWithProfile as never,
      "user-123"
    );
    expect(systemPrompt).toContain("Test User");
    expect(systemPrompt).toContain("weight_loss");
    expect(systemPrompt).toContain("intermediate");
  });
});
