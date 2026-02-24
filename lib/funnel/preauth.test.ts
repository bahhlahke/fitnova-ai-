import { describe, it, expect } from "vitest";
import {
  PREAUTH_STORAGE_KEY,
  readPreAuthDraft,
  writePreAuthDraft,
  isPreAuthDraftExpired,
} from "./preauth";

describe("pre-auth assessment draft", () => {
  it("saves and loads a valid draft", () => {
    const storage = window.localStorage;
    storage.clear();

    writePreAuthDraft(storage, {
      goal: "Weight loss",
      experience_level: "Beginner",
      days_per_week: "3 days",
      location_preference: "Home",
      nutrition_focus: "High protein",
    });

    const loaded = readPreAuthDraft(storage);
    expect(loaded?.goal).toBe("Weight loss");
    expect(loaded?.location_preference).toBe("Home");
  });

  it("clears expired draft", () => {
    const storage = window.localStorage;
    storage.clear();

    storage.setItem(
      PREAUTH_STORAGE_KEY,
      JSON.stringify({
        goal: "Weight loss",
        experience_level: "Beginner",
        days_per_week: "3 days",
        location_preference: "Home",
        nutrition_focus: "High protein",
        created_at: "2020-01-01T00:00:00.000Z",
      })
    );

    const loaded = readPreAuthDraft(storage);
    expect(loaded).toBeNull();
    expect(storage.getItem(PREAUTH_STORAGE_KEY)).toBeNull();
  });

  it("expires draft according to TTL window", () => {
    expect(
      isPreAuthDraftExpired(
        {
          goal: "Weight loss",
          experience_level: "Beginner",
          days_per_week: "3 days",
          location_preference: "Home",
          nutrition_focus: "High protein",
          created_at: new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString(),
        },
        Date.now()
      )
    ).toBe(true);
  });
});
