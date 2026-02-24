import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "./page";

const mockCreateClient = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockCreateClient(),
}));

describe("Home page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders signed-out funnel content", async () => {
    mockCreateClient.mockReturnValue(null);

    render(<HomePage />);
    expect(await screen.findByRole("link", { name: /Start 1-minute assessment/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /I already have an account/i })).toHaveAttribute("href", "/auth");
  });

  it("renders signed-in dashboard cockpit", async () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    const date = `${year}-${month}-${day}`;

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
      },
      from: vi.fn((table: string) => {
        if (table === "workout_logs") {
          const firstQuery = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockResolvedValue({ count: 2 }),
          };
          const secondQuery = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [{ date }] }),
          };
          return supabase.from.mock.calls.filter(([name]) => name === "workout_logs").length === 1 ? firstQuery : secondQuery;
        }

        if (table === "onboarding") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { completed_at: new Date().toISOString() } }),
          };
        }

        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              plan_json: {
                training_plan: { focus: "Fat-loss focused strength + conditioning" },
                nutrition_plan: { calorie_target: 2200 },
              },
            },
          }),
        };
      }),
    };

    mockCreateClient.mockReturnValue(supabase);

    render(<HomePage />);
    expect(await screen.findByText(/Today's coaching cockpit/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open coach/i })).toHaveAttribute("href", "/coach");
  });
});
