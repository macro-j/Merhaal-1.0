// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { getSavedTrips, TRIPS_STORAGE_KEY } from "./tripsStorage";

describe("saved trip compatibility", () => {
  beforeEach(() => localStorage.clear());

  it("loads a plan saved before hotel recommendations existed", () => {
    localStorage.setItem(
      TRIPS_STORAGE_KEY,
      JSON.stringify([
        {
          id: "legacy-trip",
          destination: "الرياض",
          createdAt: "2026-01-01T00:00:00.000Z",
          days: [],
        },
      ])
    );

    const trips = getSavedTrips();
    expect(trips).toHaveLength(1);
    expect(trips[0].id).toBe("legacy-trip");
    expect(trips[0].hotel).toBeUndefined();
  });
});
