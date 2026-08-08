import {
  resolveBudgetTier,
  type BudgetTier,
  type DestinationKnowledge,
  type InterestTag,
} from "../../shared/destinationsData";
import type {
  HotelCity,
  HotelKnowledge,
  HotelStyleTag,
} from "../../shared/hotelsData";
import type {
  GenerateTripParams,
  GeneratedTripPlan,
  TripHotel,
} from "../../shared/tripTypes";
import type { HotelsProvider } from "./provider";

const BUDGET_RANK: Record<BudgetTier, number> = {
  budget: 0,
  midRange: 1,
  luxury: 2,
};

function mostConservativeTier(
  first: BudgetTier,
  second: BudgetTier
): BudgetTier {
  return BUDGET_RANK[first] <= BUDGET_RANK[second] ? first : second;
}

function distanceKm(
  first: { lat: number; lng: number },
  second: { lat: number; lng: number }
): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(second.lat - first.lat);
  const longitudeDelta = toRadians(second.lng - first.lng);
  const firstLatitude = toRadians(first.lat);
  const secondLatitude = toRadians(second.lat);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function activityCoordinates(
  plan: GeneratedTripPlan,
  knowledge: DestinationKnowledge
): Array<{ lat: number; lng: number }> {
  const placeById = new Map(knowledge.places.map(place => [place.id, place]));
  return plan.days
    .flatMap(day => day.activities)
    .map(activity => placeById.get(activity.placeId)?.coordinates)
    .filter((coordinates): coordinates is { lat: number; lng: number } =>
      Boolean(coordinates)
    );
}

function averageDistanceToPlan(
  hotel: HotelKnowledge,
  selectedCoordinates: Array<{ lat: number; lng: number }>
): number | null {
  if (!hotel.coordinates || selectedCoordinates.length === 0) return null;
  return (
    selectedCoordinates.reduce(
      (total, coordinates) =>
        total + distanceKm(hotel.coordinates!, coordinates),
      0
    ) / selectedCoordinates.length
  );
}

function preferredStyles(tags: InterestTag[]): HotelStyleTag[] {
  const styles = new Set<HotelStyleTag>();
  if (tags.includes("heritage") || tags.includes("culture"))
    styles.add("heritage");
  if (tags.includes("family") || tags.includes("kids")) styles.add("family");
  if (tags.includes("shopping")) styles.add("shopping");
  if (tags.includes("relaxation") || tags.includes("nature"))
    styles.add("waterfront");
  if (tags.includes("entertainment") || tags.includes("food"))
    styles.add("lifestyle");
  return [...styles];
}

function scoreHotel(
  hotel: HotelKnowledge,
  plan: GeneratedTripPlan,
  targetTier: BudgetTier,
  selectedCoordinates: Array<{ lat: number; lng: number }>
): { score: number; averageDistanceKm: number | null } {
  const styles = preferredStyles(plan.preferences.interestTags);
  const averageDistanceKm = averageDistanceToPlan(hotel, selectedCoordinates);
  let score = hotel.budgetLevels.includes(targetTier) ? 40 : 0;
  score += styles.filter(style => hotel.styleTags.includes(style)).length * 12;

  if (plan.preferences.travelerCount >= 3 || styles.includes("family")) {
    score += hotel.familyFriendlyScore * 2;
  }
  if (plan.preferences.resolvedBudgetTier === "luxury") {
    score += hotel.luxuryLevel * 2;
  }
  if (averageDistanceKm !== null) {
    const durationWeight = 1 + (plan.metadata.durationDays - 1) * 0.25;
    score += Math.max(0, 25 - averageDistanceKm) * durationWeight;
  }
  return { score, averageDistanceKm };
}

function tierLabel(tier: BudgetTier, language: "ar" | "en"): string {
  if (language === "en") {
    return tier === "budget"
      ? "budget"
      : tier === "midRange"
        ? "mid-range"
        : "luxury";
  }
  return tier === "budget"
    ? "الاقتصادي"
    : tier === "midRange"
      ? "المتوسط"
      : "الفاخر";
}

function recommendationReasons(
  hotel: HotelKnowledge,
  tier: BudgetTier,
  averageDistanceKm: number | null,
  travelerCount: number
): { ar: string; en: string } {
  const proximityAr =
    averageDistanceKm !== null && averageDistanceKm <= 12
      ? "وموقعه عملي بالنسبة لتوزيع أنشطة الخطة"
      : "ويقدم نقطة إقامة عملية لهذه الرحلة";
  const proximityEn =
    averageDistanceKm !== null && averageDistanceKm <= 12
      ? "with a practical location for the selected itinerary"
      : "and provides a practical base for this trip";
  const groupAr = travelerCount >= 3 ? " كما يلائم تكوين مجموعة السفر." : "";
  const groupEn =
    travelerCount >= 3 ? " It also suits the travel group profile." : "";
  return {
    ar: `اختير لمواءمته مستوى الإقامة ${tierLabel(tier, "ar")} ${proximityAr}.${groupAr}`,
    en: `Selected for its ${tierLabel(tier, "en")} tier ${proximityEn}.${groupEn}`,
  };
}

function toTripHotel(
  hotel: HotelKnowledge,
  tier: BudgetTier,
  language: "ar" | "en",
  averageDistanceKm: number | null,
  travelerCount: number
): TripHotel {
  const reason = recommendationReasons(
    hotel,
    tier,
    averageDistanceKm,
    travelerCount
  );
  return {
    hotelId: hotel.id,
    name: language === "ar" ? hotel.nameAr : hotel.nameEn,
    nameAr: hotel.nameAr,
    nameEn: hotel.nameEn,
    area: language === "ar" ? hotel.areaAr : hotel.areaEn,
    areaAr: hotel.areaAr,
    areaEn: hotel.areaEn,
    budgetTier: tier,
    reason: language === "ar" ? reason.ar : reason.en,
    reasonAr: reason.ar,
    reasonEn: reason.en,
    searchQuery: hotel.searchQuery,
    externalRef: hotel.externalRefs[0],
  };
}

export async function recommendHotel(
  params: GenerateTripParams,
  plan: GeneratedTripPlan,
  knowledge: DestinationKnowledge,
  provider: HotelsProvider
): Promise<TripHotel> {
  const city = knowledge.canonicalName as HotelCity;
  const requestedTier = resolveBudgetTier(
    params.accommodationType ?? params.budgetTier
  );
  const targetTier = mostConservativeTier(
    requestedTier,
    plan.preferences.resolvedBudgetTier
  );
  const hotels = await provider.listHotels(city);
  const candidates = hotels.filter(hotel =>
    hotel.budgetLevels.includes(targetTier)
  );

  if (candidates.length === 0) {
    throw new Error(`No curated ${targetTier} hotel is available for ${city}.`);
  }

  const selectedCoordinates = activityCoordinates(plan, knowledge);
  const selected = candidates
    .map(hotel => ({
      hotel,
      ...scoreHotel(hotel, plan, targetTier, selectedCoordinates),
    }))
    .sort(
      (first, second) =>
        second.score - first.score ||
        first.hotel.id.localeCompare(second.hotel.id)
    )[0];

  return toTripHotel(
    selected.hotel,
    targetTier,
    params.language,
    selected.averageDistanceKm,
    plan.preferences.travelerCount
  );
}
