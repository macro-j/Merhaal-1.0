// @vitest-environment node
import { describe, expect, it } from "vitest";
import { HOTEL_KNOWLEDGE } from "../../shared/hotelsData";
import type { GenerateTripParams } from "../../shared/tripTypes";
import { buildDraftPlan } from "../planning/engine";
import { curatedHotelsProvider } from "./provider";
import { recommendHotel } from "./recommender";

const tierCases = [
  { budgetTier: "اقتصادية", resolvedTier: "budget", dailyBudget: 600 },
  { budgetTier: "متوسطة", resolvedTier: "midRange", dailyBudget: 1_200 },
  { budgetTier: "فاخرة", resolvedTier: "luxury", dailyBudget: 3_500 },
] as const;

async function buildRecommendation(overrides: Partial<GenerateTripParams>) {
  const params: GenerateTripParams = {
    destination: "الرياض",
    durationDays: 2,
    budgetTier: "متوسطة",
    accommodationType: "متوسطة",
    totalBudgetSAR: 4_800,
    travelerCount: 2,
    interests: ["ترند ولايف ستايل"],
    language: "ar",
    startDate: "2026-10-01",
    ...overrides,
  };
  const { plan, context } = buildDraftPlan(params);
  const hotel = await recommendHotel(
    params,
    plan,
    context.knowledge,
    curatedHotelsProvider
  );
  return { hotel, params, plan, context };
}

describe("Hotels v1 recommender", () => {
  it("covers both cities, every budget tier, and solo/couple/family groups", async () => {
    for (const destination of ["الرياض", "جدة"] as const) {
      for (const travelerCount of [1, 2, 4]) {
        for (const tier of tierCases) {
          const { hotel, context } = await buildRecommendation({
            destination,
            travelerCount,
            budgetTier: tier.budgetTier,
            accommodationType: tier.budgetTier,
            totalBudgetSAR: tier.dailyBudget * 2 * travelerCount,
            interests:
              travelerCount === 4
                ? ["حيوية وترفيه", "استرخاء وطبيعة"]
                : ["ترند ولايف ستايل"],
          });
          const sourceHotel = HOTEL_KNOWLEDGE.find(
            candidate => candidate.id === hotel.hotelId
          );

          expect(sourceHotel).toBeDefined();
          expect(sourceHotel?.city).toBe(context.knowledge.canonicalName);
          expect(hotel.budgetTier).toBe(tier.resolvedTier);
          expect(sourceHotel?.budgetLevels).toContain(tier.resolvedTier);
          expect(hotel.nameAr).toBe(sourceHotel?.nameAr);
          expect(hotel.nameEn).toBe(sourceHotel?.nameEn);
        }
      }
    }
  });

  it("does not recommend luxury when the per-traveler budget resolves lower", async () => {
    const { hotel, plan } = await buildRecommendation({
      budgetTier: "فاخرة",
      accommodationType: "فاخرة",
      travelerCount: 4,
      totalBudgetSAR: 3_200,
    });

    expect(plan.preferences.resolvedBudgetTier).toBe("budget");
    expect(hotel.budgetTier).toBe("budget");
  });

  it("returns the same hotel for identical structured inputs", async () => {
    const first = await buildRecommendation({
      destination: "جدة",
      travelerCount: 4,
    });
    const second = await buildRecommendation({
      destination: "جدة",
      travelerCount: 4,
    });
    expect(first.hotel.hotelId).toBe(second.hotel.hotelId);
  });

  it("keeps the curated knowledge base small, unique, and fully sourced", () => {
    expect(HOTEL_KNOWLEDGE).toHaveLength(8);
    expect(new Set(HOTEL_KNOWLEDGE.map(hotel => hotel.id)).size).toBe(8);
    for (const city of ["Riyadh", "Jeddah"] as const) {
      const hotels = HOTEL_KNOWLEDGE.filter(hotel => hotel.city === city);
      expect(hotels).toHaveLength(4);
      expect(new Set(hotels.flatMap(hotel => hotel.budgetLevels))).toEqual(
        new Set(["budget", "midRange", "luxury"])
      );
    }
    for (const hotel of HOTEL_KNOWLEDGE) {
      expect(hotel.externalRefs[0]?.url).toMatch(/^https:\/\//);
      expect(hotel.searchQuery.length).toBeGreaterThan(4);
      expect(hotel.familyFriendlyScore).toBeGreaterThanOrEqual(1);
      expect(hotel.familyFriendlyScore).toBeLessThanOrEqual(10);
      expect(hotel.luxuryLevel).toBeGreaterThanOrEqual(1);
      expect(hotel.luxuryLevel).toBeLessThanOrEqual(10);
    }
  });
});
