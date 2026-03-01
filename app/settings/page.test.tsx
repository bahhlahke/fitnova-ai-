import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SettingsPage from "./page";

const mockCreateClient = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockCreateClient(),
}));

vi.mock("@/components/auth/AuthSettings", () => ({
  AuthSettings: () => <div data-testid="auth-settings" />,
}));

type MockProfileRow = {
  user_id?: string;
  devices?: Record<string, unknown>;
  dietary_preferences?: Record<string, unknown>;
  subscription_status?: "free" | "pro";
  phone_number?: string;
  height?: number;
  weight?: number;
};

function setupSupabase(profile: MockProfileRow = {}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: {
      user_id: "user-1",
      devices: {},
      dietary_preferences: {},
      subscription_status: "free",
      ...profile,
    },
    error: null,
  });

  const selectChain = {
    eq: vi.fn(),
    maybeSingle,
  };
  selectChain.eq.mockReturnValue(selectChain);

  const select = vi.fn().mockReturnValue(selectChain);
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn((table: string) => {
    if (table !== "user_profile") {
      throw new Error(`Unexpected table requested in settings test: ${table}`);
    }
    return { select, upsert };
  });

  const getUser = vi.fn().mockResolvedValue({
    data: {
      user: {
        id: "user-1",
        email: "athlete@example.com",
      },
    },
  });

  const supabase = {
    auth: { getUser },
    from,
  };

  mockCreateClient.mockReturnValue(supabase);

  return { upsert, getUser };
}

describe("Settings page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes phone number before saving profile", async () => {
    const { upsert } = setupSupabase();

    render(<SettingsPage />);

    const phoneInput = await screen.findByLabelText(/Phone number/i);
    fireEvent.change(phoneInput, { target: { value: "(555) 123-4567" } });
    fireEvent.click(screen.getByRole("button", { name: /Save settings/i }));

    await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1));

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        phone_number: "+15551234567",
      }),
      { onConflict: "user_id" }
    );
  });

  it("shows validation error and skips save on invalid phone number", async () => {
    const { upsert } = setupSupabase();

    render(<SettingsPage />);

    const phoneInput = await screen.findByLabelText(/Phone number/i);
    fireEvent.change(phoneInput, { target: { value: "12345" } });
    fireEvent.click(screen.getByRole("button", { name: /Save settings/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Phone number must include 10-15 digits.");
    expect(upsert).not.toHaveBeenCalled();
  });
});
