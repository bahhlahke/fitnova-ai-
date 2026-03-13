import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, act } from "@testing-library/react";
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
    vi.useFakeTimers();
    render(<StartAssessmentPage />);

    // Step 0: Goal
    fireEvent.click(screen.getByRole("button", { name: /Initialize Next Step/i }));

    // Step 1: Frequency
    fireEvent.click(screen.getByRole("button", { name: /Initialize Next Step/i }));

    // Step 2: Experience
    fireEvent.click(screen.getByRole("button", { name: /Initialize Next Step/i }));

    // Step 3: Location -> Triggers Step 4 (Generating)
    fireEvent.click(screen.getByRole("button", { name: /Initialize Next Step/i }));

    // Advancing timers to skip Step 4 (Generating Protocol)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    // Step 5: Preview (First 7 Days)
    fireEvent.click(screen.getByRole("button", { name: /See My Full Plan/i }));

    // Step 6: Email Capture
    fireEvent.change(screen.getByPlaceholderText(/athlete@koda.ai/i), { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Claim Protocol/i }));

    const saved = window.localStorage.getItem(PREAUTH_STORAGE_KEY);
    expect(saved).toContain("goal");
    expect(push).toHaveBeenCalledWith("/auth?next=/onboarding?resume=1&intent=assessment");
    
    vi.useRealTimers();
  });
});
