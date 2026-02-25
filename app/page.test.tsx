import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createClient } from "@/lib/supabase/client";
import HomePage from "./page";

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

describe("Home page", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockClear();
  });

  it("renders signed-out funnel content", async () => {
    vi.mocked(createClient).mockReturnValue(null);

    render(<HomePage />);
    expect(await screen.findByRole("link", { name: /Start 1-minute assessment/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /I already have an account/i })).toHaveAttribute("href", "/auth");
  });

  // TODO: fix mock so daily_plans query gets chain with .order().limit().maybeSingle(); currently hits catch
  it.skip("renders signed-in dashboard cockpit", async () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    const date = `${year}-${month}-${day}`;

    const planData = {
      data: {
        plan_json: {
          training_plan: { focus: "Fat-loss focused strength + conditioning" },
          nutrition_plan: { calorie_target: 2200 },
        },
      },
    };
    let fromCallIndex = 0;
    const buildChainWithMaybeSingle = (resolved: { data: unknown }) => {
      let c: Record<string, unknown>;
      c = {
        select: () => c,
        eq: () => c,
        order: () => c,
        limit: () => c,
        maybeSingle: () => Promise.resolve(resolved),
      };
      return c;
    };
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
      },
      from: vi.fn((_table: string) => {
        const idx = fromCallIndex++;
        if (idx === 0) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockResolvedValue({ count: 2 }),
          };
        }
        if (idx === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [{ date }] }),
          };
        }
        if (idx === 2) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { completed_at: new Date().toISOString() } }),
          };
        }
        if (idx === 3) return buildChainWithMaybeSingle(planData);
        if (idx === 4) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { devices: {} } }),
          };
        }
        if (idx === 5) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          };
        }
        if (idx === 6) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [{ date }] }),
          };
        }
        return buildChainWithMaybeSingle(planData);
      }),
    };

    vi.mocked(createClient).mockReturnValue(supabase);

    render(<HomePage />);
    expect(await screen.findByText(/Today's coaching cockpit/i, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open coach/i })).toHaveAttribute("href", "/coach");
  });
});
