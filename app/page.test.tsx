import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "./page";

describe("Dashboard page", () => {
  it("renders FitNova branding and quick actions", () => {
    render(<DashboardPage />);
    expect(screen.getByText(/FitNova/)).toBeInTheDocument();
    expect(screen.getByText(/Your progress at a glance/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Start workout/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ask coach/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Progress/i })).toBeInTheDocument();
    // Onboarding link is shown only when user has not completed onboarding
  });

  it("has correct hrefs for main actions", () => {
    render(<DashboardPage />);
    expect(screen.getByRole("link", { name: /Start workout/i })).toHaveAttribute("href", "/log/workout");
    expect(screen.getByRole("link", { name: /Ask coach/i })).toHaveAttribute("href", "/coach");
    expect(screen.getByRole("link", { name: /Progress/i })).toHaveAttribute("href", "/progress");
  });
});
