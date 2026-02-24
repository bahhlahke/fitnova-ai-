import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AuthPage from "./page";

describe("Auth page", () => {
  it("renders sign in heading and email input", () => {
    render(<AuthPage />);
    expect(screen.getByRole("heading", { name: /Sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send magic link/i })).toBeInTheDocument();
  });

  it("has link back to dashboard", () => {
    render(<AuthPage />);
    const back = screen.getByRole("link", { name: /Back to dashboard/i });
    expect(back).toHaveAttribute("href", "/");
  });
});
