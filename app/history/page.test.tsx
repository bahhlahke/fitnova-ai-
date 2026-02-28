import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import HistoryPage from "./page";

const replace = vi.fn();
const mockCreateClient = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => ({
    get: (key: string) => (key === "tab" ? "nutrition" : null),
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockCreateClient(),
}));

describe("History page", () => {
  beforeEach(() => {
    replace.mockReset();
    window.history.replaceState({}, "", "/history?tab=nutrition");

    mockCreateClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
      },
      from: vi.fn((table: string) => {
        const resolved = table === "workout_logs" ? { data: [] } : { data: [] };
        const chain = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          order: vi.fn(() => chain),
          limit: vi.fn(() => Promise.resolve(resolved)),
        };
        return chain;
      }),
    });
  });

  it("initializes the nutrition tab from the query string", async () => {
    render(<HistoryPage />);

    expect(await screen.findByText(/No nutrition logs yet\./i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to Nutrition/i })).toHaveAttribute(
      "href",
      "/log/nutrition"
    );
  });
});
