import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CoachPage from "./page";

vi.mock("@/lib/supabase/client", () => ({
    createClient: vi.fn(),
}));

describe("Coach Room Apple Watch UI", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        global.fetch = vi.fn();
    });

    it("renders standard UI initially", () => {
        render(<CoachPage />);
        expect(screen.getByText(/Control Center/)).toBeInTheDocument();
    });

    it("can generate a plan and enter watch mode", async () => {
        // Mock the fetch call for generateDailyPlan
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                plan: {
                    training_plan: {
                        focus: "Legs",
                        duration_minutes: 40,
                        exercises: [
                            { name: "Squats", sets: 3, reps: 10 },
                        ],
                    },
                    nutrition_plan: { calorie_target: 2000, macros: { protein_g: 150 } },
                }
            })
        });

        render(<CoachPage />);

        // Generate plan
        const genBtn = screen.getByRole("button", { name: /Generate Today's Protocol/i });
        fireEvent.click(genBtn);

        // Wait for plan to load
        await waitFor(() => {
            expect(screen.getByText(/Enter Watch Mode/i)).toBeInTheDocument();
        });

        // Enter Watch Mode
        const watchBtn = screen.getByText(/Enter Watch Mode/i);
        fireEvent.click(watchBtn);

        // Verify watch UI is rendered
        expect(screen.getByText(/Set 1 of 3/i)).toBeInTheDocument();
        expect(screen.getByText(/Squats/i)).toBeInTheDocument();

        // Test cycling exercises
        const nextBtn = screen.getByRole("button", { name: /Next/i });
        fireEvent.click(nextBtn);

        // Should be complete now since there was only 1 exercise
        expect(screen.getByText(/Session/i)).toBeInTheDocument();
        expect(screen.getByText(/Complete/i)).toBeInTheDocument();
    });
});
