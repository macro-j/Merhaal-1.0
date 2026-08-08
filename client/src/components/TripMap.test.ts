// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import type { TripActivity } from "@shared/tripTypes";
import { getActivityMarkers } from "./TripMap";

function activity(id: string, locationName: string): TripActivity {
  return {
    id,
    placeId: id,
    activityType: "heritage",
    time: "الصباح",
    startTime: "09:00",
    endTime: "11:00",
    title: id,
    description: "وصف النشاط",
    reason: "سبب الاختيار",
    locationName,
    bookingSearchQuery: locationName,
  };
}

describe("TripMap marker grounding", () => {
  it("uses curated coordinates, preserves order, and removes stacked duplicates", () => {
    const location = "At-Turaif World Heritage Site, Diriyah";
    const points = getActivityMarkers(
      [activity("first", location), activity("duplicate", location)],
      "Riyadh"
    );

    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({ activityId: "first", order: 1 });
    expect(points[0].lat).toEqual(expect.any(Number));
    expect(points[0].lng).toEqual(expect.any(Number));
  });

  it("ignores unknown places instead of inventing coordinates", () => {
    expect(
      getActivityMarkers([activity("unknown", "Imaginary Place")], "Riyadh")
    ).toEqual([]);
  });
});
