import { describe, it, expect, vi } from "vitest";
import LogPage from "./page";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

describe("Log page", () => {
  it("redirects to the workout tab", () => {
    LogPage();
    expect(mocks.redirect).toHaveBeenCalledWith("/log/workout");
  });
});
