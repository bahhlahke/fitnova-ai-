import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import StartAssessmentPage from "./page";
import { PREAUTH_STORAGE_KEY } from "@/lib/funnel/preauth";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("Start assessment page", () => {
  beforeEach(() => {
    push.mockReset();
    window.localStorage.clear();
  });

  it("stores draft and redirects to auth on completion", async () => {
    render(<StartAssessmentPage />);

    // Step 0: Email
    fireEvent.change(screen.getByPlaceholderText(/athlete@example.com/i), { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // Step 1: Goal
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // Step 2: Frequency
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // Step 3: Location
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // Step 4: Nutrition
    fireEvent.click(screen.getByRole("button", { name: /Continue to sign up/i }));

    const saved = window.localStorage.getItem(PREAUTH_STORAGE_KEY);
    expect(saved).toContain("goal");
    expect(push).toHaveBeenCalledWith("/auth?next=/onboarding?resume=1&intent=assessment");
  });
});
