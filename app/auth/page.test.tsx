import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import AuthPage from "./page";

const mockCreateClient = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockCreateClient(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === "next") return "/onboarding?resume=1";
      return null;
    },
  }),
}));

describe("Auth page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders both Google and magic-link auth methods", () => {
    mockCreateClient.mockReturnValue(null);
    render(<AuthPage />);

    expect(screen.getByRole("heading", { name: /Create your FitNova coaching account/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue with Google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send magic link/i })).toBeInTheDocument();
  });

  it("shows plain-language error when auth client is unavailable", async () => {
    mockCreateClient.mockReturnValue(null);
    render(<AuthPage />);

    fireEvent.click(screen.getByRole("button", { name: /Continue with Google/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/configured/i);
  });
});
