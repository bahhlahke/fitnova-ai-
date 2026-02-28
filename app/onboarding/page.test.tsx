import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OnboardingPage from "./page";

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => null),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

describe("Onboarding page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not mark onboarding completed when saving fails", async () => {
    render(<OnboardingPage />);

    for (let i = 0; i < 5; i += 1) {
      const nextBtn = screen.getByRole("button", {
        name: i < 4 ? /next/i : /finish/i,
      });
      fireEvent.click(nextBtn);
    }

    expect(screen.queryByText(/your plan is ready/i)).not.toBeInTheDocument();
    expect(
      await screen.findByText(/Supabase not configured\.|supabase/i)
    ).toBeInTheDocument();
  });
});
