import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OnboardingPage from "./page";

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => null),
}));

describe("Onboarding page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not mark onboarding completed when saving fails", async () => {
    render(<OnboardingPage />);

    for (let i = 0; i < 6; i += 1) {
      const nextBtn = screen.getByRole("button", {
        name: i < 5 ? /next/i : /finish/i,
      });
      fireEvent.click(nextBtn);
    }

    expect(screen.queryByText(/you’re all set/i)).not.toBeInTheDocument();
    expect(
      await screen.findByText(/Supabase not configured\.|supabase/i)
    ).toBeInTheDocument();
  });
});
