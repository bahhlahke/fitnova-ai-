import { describe, it, expect, vi } from "vitest";
import OmniPage from "./page";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

describe("Omni page", () => {
  it("redirects to the dashboard AI surface", () => {
    OmniPage();
    expect(mocks.redirect).toHaveBeenCalledWith("/?focus=ai");
  });
});
