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

  it("stores draft and redirects to auth on completion", () => {
    render(<StartAssessmentPage />);

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /Continue to sign up/i }));

    const saved = window.localStorage.getItem(PREAUTH_STORAGE_KEY);
    expect(saved).toContain("goal");
    expect(push).toHaveBeenCalledWith("/auth?next=/onboarding?resume=1&intent=assessment");
  });
});
