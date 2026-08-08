// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import type { TripHotel } from "@shared/tripTypes";
import { HotelRecommendationCard } from "./HotelRecommendationCard";

const hotel: TripHotel = {
  hotelId: "riyadh-centro-olaya",
  name: "سنترو العليا من روتانا",
  nameAr: "سنترو العليا من روتانا",
  nameEn: "Centro Olaya by Rotana",
  area: "العليا",
  areaAr: "العليا",
  areaEn: "Al Olaya",
  budgetTier: "midRange",
  reason: "اختير لمواءمته مستوى الإقامة المتوسط.",
  reasonAr: "اختير لمواءمته مستوى الإقامة المتوسط.",
  reasonEn: "Selected for its mid-range tier.",
  searchQuery: "Centro Olaya by Rotana Riyadh",
  externalRef: {
    provider: "rotana",
    url: "https://www.rotana.com/",
  },
};

function renderCard(value?: TripHotel) {
  return render(
    <LanguageProvider>
      <HotelRecommendationCard hotel={value} destination="Riyadh" />
    </LanguageProvider>
  );
}

describe("HotelRecommendationCard", () => {
  beforeEach(() => localStorage.clear());

  it("renders verified structured fields without price, rating, stars, or booking claims", () => {
    renderCard(hotel);
    expect(screen.getByText("سنترو العليا من روتانا")).toBeDefined();
    expect(screen.getByText("العليا")).toBeDefined();
    expect(screen.getByText("متوسط")).toBeDefined();
    expect(
      screen.getByRole("link", { name: /ابحث عن الفندق/ }).getAttribute("href")
    ).toContain("google.com/search");
    expect(document.body.textContent).not.toMatch(
      /ريال|نجوم|تقييم|Booking\.com/
    );
  });

  it("renders English content and LTR direction", () => {
    localStorage.setItem("marhal-language", "en");
    renderCard(hotel);
    expect(screen.getByText("Centro Olaya by Rotana")).toBeDefined();
    expect(screen.getByText("Al Olaya")).toBeDefined();
    expect(screen.getByTestId("hotel-recommendation").getAttribute("dir")).toBe(
      "ltr"
    );
  });

  it("renders nothing for a legacy trip with no hotel recommendation", () => {
    const { container } = renderCard(undefined);
    expect(container.innerHTML).toBe("");
  });
});
