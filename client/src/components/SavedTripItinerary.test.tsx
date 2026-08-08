// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import type { TripActivity, TripDay } from "@shared/tripTypes";
import { SavedTripItinerary } from "./ItineraryView";

vi.mock("@/components/TripMap", () => ({
  default: ({ activities }: { activities: TripActivity[] }) => (
    <div data-testid="mock-trip-map">
      {activities.map(activity => activity.id).join(",")}
    </div>
  ),
}));

function activity(id: string, title: string): TripActivity {
  return {
    id,
    placeId: id,
    activityType: "heritage",
    time: "الصباح",
    startTime: "09:00",
    endTime: "11:00",
    title,
    description: "وصف مختصر للنشاط المختار ضمن الرحلة.",
    reason: "اختير لأنه يناسب اهتمامات الرحلة.",
    locationName: "At-Turaif World Heritage Site, Diriyah",
    bookingSearchQuery: "At-Turaif World Heritage Site, Diriyah",
  };
}

const days: TripDay[] = [
  {
    dayNumber: 1,
    date: "2026-10-01",
    title: "اليوم الأول",
    activities: [activity("one", "نشاط اليوم الأول")],
  },
  {
    dayNumber: 2,
    date: "2026-10-02",
    title: "اليوم الثاني",
    activities: [activity("two", "نشاط اليوم الثاني")],
  },
];

function renderItinerary() {
  return render(
    <LanguageProvider>
      <ThemeProvider defaultTheme="light" switchable>
        <SavedTripItinerary days={days} destination="Riyadh" />
      </ThemeProvider>
    </LanguageProvider>
  );
}

describe("SavedTripItinerary", () => {
  beforeEach(() => localStorage.clear());

  it("shows one active day and synchronizes its activities with the map", async () => {
    renderItinerary();
    expect(screen.getByText("نشاط اليوم الأول")).toBeDefined();
    expect(screen.queryByText("نشاط اليوم الثاني")).toBeNull();
    expect(await screen.findByTestId("mock-trip-map")).toHaveProperty(
      "textContent",
      "one"
    );

    fireEvent.click(screen.getByTestId("button-day-2"));
    expect(screen.getByText("نشاط اليوم الثاني")).toBeDefined();
    expect(screen.queryByText("نشاط اليوم الأول")).toBeNull();
    expect(screen.getByTestId("mock-trip-map")).toHaveProperty(
      "textContent",
      "two"
    );
  });

  it("renders safely when an old saved trip has no hotel", () => {
    renderItinerary();
    expect(screen.queryByTestId("hotel-recommendation")).toBeNull();
  });
});
