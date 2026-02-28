import { describe, it, expect, vi } from "vitest";
import CoachMotionLabPage from "./page";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

describe("Legacy motion lab page", () => {
  it("redirects to the workout-owned motion lab route", () => {
    CoachMotionLabPage();
    expect(mocks.redirect).toHaveBeenCalledWith("/motion");
  });
});
