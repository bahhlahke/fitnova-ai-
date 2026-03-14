import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SettingsPage from "./page";

const mockCreateClient = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockCreateClient(),
}));

const mockUser = { id: "user-1", email: "athlete@example.com" };

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock("@/components/auth/AuthSettings", () => ({
  AuthSettings: () => <div data-testid="auth-settings" />,
}));

vi.mock("@/components/profile/BadgeCollection", () => ({
  BadgeCollection: () => <div data-testid="badge-collection" />,
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
    if (table === "user_profile") {
      return { select, upsert };
    }
    // Return a default no-op chain for any other table
    const defaultChain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    };
    return defaultChain;
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
    fireEvent.click(screen.getByLabelText(/I agree to the/i));
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
    fireEvent.click(screen.getByLabelText(/I agree to the/i));
    fireEvent.click(screen.getByRole("button", { name: /Save settings/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Phone number must include 10-15 digits.");
    expect(upsert).not.toHaveBeenCalled();
  });
});
