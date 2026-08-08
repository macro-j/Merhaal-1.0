import type { DestinationPlace } from "../../shared/destinationsData";
import type { GeneratedTripPlan, TripQuality, TripQualityBreakdown } from "../../shared/tripTypes";
import type { PlanningContext } from "./engine";

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function timeToMinutes(value: string): number | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function calculateQuality(plan: GeneratedTripPlan, context: PlanningContext): TripQuality {
  const activities = plan.days.flatMap((day) => day.activities);
  const placeById = new Map(context.knowledge.places.map((place) => [place.id, place]));
  const resolvedPlaces = activities
    .map((activity) => placeById.get(activity.placeId))
    .filter((place): place is DestinationPlace => Boolean(place));
  const nonMealPlaces = activities
    .map((activity) => ({ activity, place: placeById.get(activity.placeId) }))
    .filter((entry): entry is { activity: typeof activities[number]; place: DestinationPlace } =>
      Boolean(entry.place) && !entry.activity.mealSlot
    )
    .map((entry) => entry.place);
  const matchingInterests = nonMealPlaces.filter((place) =>
    place.interests.some((tag) => context.interestTags.includes(tag))
  ).length;
  const interestMatch = context.interestTags.length === 0
    ? 100
    : clamp((matchingInterests / Math.max(1, nonMealPlaces.length)) * 100);

  const budgetMatches = resolvedPlaces.filter((place) => {
    if (place.budgetLevel.includes(context.budgetTier)) return true;
    if (context.budgetTier === "luxury") return true;
    return context.budgetTier === "midRange" && place.budgetLevel.includes("budget");
  }).length;
  const budgetMatch = clamp((budgetMatches / Math.max(1, activities.length)) * 100);

  const uniqueCategories = new Set(nonMealPlaces.map((place) => place.category)).size;
  const diversity = clamp((uniqueCategories / Math.max(1, Math.min(3, nonMealPlaces.length))) * 100);

  const ids = activities.map((activity) => activity.placeId);
  const noDuplicates = new Set(ids).size === ids.length ? 100 : 0;
  const balancedDays = plan.days.filter(
    (day, dayIndex) => day.activities.length === (context.daySchedules[dayIndex]?.slots.length ?? 0)
  ).length;
  const dailyBalance = clamp((balancedDays / Math.max(1, plan.days.length)) * 100);
  const compliantMeals = plan.days.filter((day, dayIndex) => {
    const expected = (context.daySchedules[dayIndex]?.slots ?? [])
      .map((slot) => slot.mealSlot)
      .filter(Boolean);
    const actual = day.activities.map((activity) => activity.mealSlot).filter(Boolean);
    return JSON.stringify(actual) === JSON.stringify(expected);
  }).length;
  const mealsCompliance = clamp((compliantMeals / Math.max(1, plan.days.length)) * 100);

  let validTimePairs = 0;
  let totalTimePairs = 0;
  for (const day of plan.days) {
    let previousEnd: number | null = null;
    for (const activity of day.activities) {
      const start = timeToMinutes(activity.startTime);
      const end = timeToMinutes(activity.endTime);
      totalTimePairs += 1;
      if (
        start !== null &&
        end !== null &&
        end > start &&
        (previousEnd === null || (start >= previousEnd && start - previousEnd <= 180))
      ) {
        validTimePairs += 1;
      }
      previousEnd = end;
    }
  }
  const timeConsistency = clamp((validTimePairs / Math.max(1, totalTimePairs)) * 100);
  const knowledgeBaseCoverage = clamp((resolvedPlaces.length / Math.max(1, activities.length)) * 100);

  const breakdown: TripQualityBreakdown = {
    interestMatch,
    budgetMatch,
    diversity,
    noDuplicates,
    dailyBalance,
    mealsCompliance,
    timeConsistency,
    knowledgeBaseCoverage,
  };
  const score = clamp(
    interestMatch * 0.2 +
      budgetMatch * 0.15 +
      diversity * 0.15 +
      noDuplicates * 0.15 +
      dailyBalance * 0.1 +
      mealsCompliance * 0.1 +
      timeConsistency * 0.1 +
      knowledgeBaseCoverage * 0.05
  );

  return { score, breakdown };
}
