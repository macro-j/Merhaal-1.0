import { randomUUID } from "node:crypto";
import {
  normalizeInterests,
  resolveBudgetTier,
  resolveDestination,
  type BudgetTier,
  type DestinationKnowledge,
  type DestinationPlace,
  type InterestTag,
  type MealSlot,
  type TimeBlock,
} from "../../shared/destinationsData";
import type {
  GenerateTripParams,
  GeneratedTripPlan,
  TripActivity,
  TripActivityTime,
  TripDay,
  TripMood,
} from "../../shared/tripTypes";
import { PlanningError } from "./errors";

export interface PlanningContext {
  knowledge: DestinationKnowledge;
  interestTags: InterestTag[];
  budgetTier: BudgetTier;
  mealsPerDay: 2 | 3;
  minimumInterestCoverage: number;
}

export interface DraftPlanResult {
  plan: GeneratedTripPlan;
  context: PlanningContext;
}

type ScheduleSlot = {
  kind: "place" | "meal";
  startTime: string;
  endTime: string;
  time: TripActivityTime;
  timeBlocks: TimeBlock[];
  mealSlot?: Exclude<MealSlot, "قهوة" | "لا ينطبق">;
};

const SCHEDULES: Record<2 | 3, ScheduleSlot[]> = {
  2: [
    { kind: "place", startTime: "09:00", endTime: "11:00", time: "الصباح", timeBlocks: ["morning"] },
    { kind: "meal", mealSlot: "غداء", startTime: "12:00", endTime: "13:30", time: "الظهر", timeBlocks: ["afternoon"] },
    { kind: "place", startTime: "16:00", endTime: "18:00", time: "الظهر", timeBlocks: ["afternoon", "evening"] },
    { kind: "meal", mealSlot: "عشاء", startTime: "19:00", endTime: "20:30", time: "المساء", timeBlocks: ["evening", "night"] },
  ],
  3: [
    { kind: "meal", mealSlot: "فطور", startTime: "08:00", endTime: "09:00", time: "الصباح", timeBlocks: ["morning"] },
    { kind: "place", startTime: "09:30", endTime: "11:30", time: "الصباح", timeBlocks: ["morning"] },
    { kind: "meal", mealSlot: "غداء", startTime: "12:00", endTime: "13:30", time: "الظهر", timeBlocks: ["afternoon"] },
    { kind: "place", startTime: "15:00", endTime: "17:30", time: "الظهر", timeBlocks: ["afternoon", "evening"] },
    { kind: "meal", mealSlot: "عشاء", startTime: "18:00", endTime: "19:30", time: "المساء", timeBlocks: ["evening", "night"] },
  ],
};

const NON_ACTIVITY_CATEGORIES = new Set(["dining", "cafe"]);

function budgetAllowed(place: DestinationPlace, tier: BudgetTier): boolean {
  if (place.budgetLevel.includes(tier)) return true;
  if (tier === "luxury") return true;
  return tier === "midRange" && place.budgetLevel.includes("budget");
}

function averageCost(place: DestinationPlace): number | null {
  const min = place.minRecommendedBudgetSAR;
  const max = place.maxRecommendedBudgetSAR;
  if (typeof min === "number" && typeof max === "number") return Math.round((min + max) / 2);
  if (typeof min === "number") return min;
  if (typeof max === "number") return max;
  return null;
}

function distanceKm(a: DestinationPlace, b: DestinationPlace): number | null {
  if (!a.coordinates || !b.coordinates) return null;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const latDelta = toRad(b.coordinates.lat - a.coordinates.lat);
  const lngDelta = toRad(b.coordinates.lng - a.coordinates.lng);
  const lat1 = toRad(a.coordinates.lat);
  const lat2 = toRad(b.coordinates.lat);
  const h =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function scorePlace(
  place: DestinationPlace,
  context: PlanningContext,
  slot: ScheduleSlot,
  categoryCounts: Map<string, number>,
  previous?: DestinationPlace
): number {
  let score = place.priorityScore;
  score += place.budgetLevel.includes(context.budgetTier) ? 20 : 5;
  score += place.interests.filter((tag) => context.interestTags.includes(tag)).length * 16;
  score += slot.timeBlocks.some((block) => place.recommendedTime.includes(block)) ? 14 : -40;
  score -= (categoryCounts.get(place.category) ?? 0) * 18;

  if (context.interestTags.includes("heritage")) score += place.localAuthenticityScore * 2;
  if (context.interestTags.includes("food")) score += place.trendScore;
  if (context.interestTags.includes("relaxation")) score += place.category === "nature" ? 15 : 0;

  if (previous) {
    if (previous.area === place.area) score += 18;
    if (previous.nearbyPlaceIds?.includes(place.id)) score += 12;
    const distance = distanceKm(previous, place);
    if (distance !== null) {
      if (distance <= 5) score += 12;
      else if (distance <= 15) score += 6;
      else if (distance >= 40) score -= 12;
    }
  }

  return score;
}

function isCompatible(place: DestinationPlace, slot: ScheduleSlot): boolean {
  if (!slot.timeBlocks.some((block) => place.recommendedTime.includes(block))) return false;
  if (slot.kind === "meal") {
    return place.category === "dining" && Boolean(slot.mealSlot && place.mealSlot.includes(slot.mealSlot));
  }
  return !NON_ACTIVITY_CATEGORIES.has(place.category);
}

function pickPlace(
  pool: DestinationPlace[],
  usedIds: Set<string>,
  context: PlanningContext,
  slot: ScheduleSlot,
  categoryCounts: Map<string, number>,
  previous?: DestinationPlace
): DestinationPlace | null {
  return (
    pool
      .filter((place) => !usedIds.has(place.id) && isCompatible(place, slot))
      .map((place) => ({ place, score: scorePlace(place, context, slot, categoryCounts, previous) }))
      .sort((a, b) => b.score - a.score || a.place.id.localeCompare(b.place.id))[0]?.place ?? null
  );
}

function reasonFor(place: DestinationPlace, interests: TripMood[], tags: InterestTag[]): string {
  const matches = place.interests.filter((tag) => tags.includes(tag));
  if (matches.length > 0 && interests.length > 0) {
    return `اختير لتوافقه مع نمط الرحلة: ${interests.join("، ")}.`;
  }
  return "اختير لتوازنه مع وقت الزيارة والميزانية وتسلسل اليوم.";
}

function toActivity(
  place: DestinationPlace,
  slot: ScheduleSlot,
  dayNumber: number,
  interests: TripMood[],
  tags: InterestTag[]
): TripActivity {
  const isMeal = slot.kind === "meal";
  return {
    id: `day-${dayNumber}-${place.id}`,
    placeId: place.id,
    activityType: place.category,
    mealSlot: slot.mealSlot,
    time: slot.time,
    startTime: slot.startTime,
    endTime: slot.endTime,
    title: isMeal && slot.mealSlot ? `${slot.mealSlot} في ${place.arabicName}` : `زيارة ${place.arabicName}`,
    description: place.shortDescription,
    reason: reasonFor(place, interests, tags),
    locationName: place.mapSearchQuery,
    bookingSearchQuery: place.bookingDifficulty === "لا يحتاج" ? place.mapSearchQuery : `${place.mapSearchQuery} booking`,
    estimatedCostSAR: averageCost(place),
  };
}

function addDays(date: string, amount: number): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + amount);
  return parsed.toISOString().slice(0, 10);
}

function fallbackBudget(days: number, tier: BudgetTier): number {
  const daily = tier === "luxury" ? 3200 : tier === "midRange" ? 1000 : 450;
  return daily * days;
}

function getAffordableBudgetTier(totalBudgetSAR: number, days: number, travelerCount: number): BudgetTier {
  const dailyPerPerson = totalBudgetSAR / Math.max(1, days * travelerCount);
  if (dailyPerPerson >= 2500) return "luxury";
  if (dailyPerPerson >= 800) return "midRange";
  return "budget";
}

function mostConservativeTier(requested: BudgetTier, affordable: BudgetTier): BudgetTier {
  const rank: Record<BudgetTier, number> = { budget: 0, midRange: 1, luxury: 2 };
  return rank[requested] <= rank[affordable] ? requested : affordable;
}

function calculateMinimumInterestCoverage(
  pool: DestinationPlace[],
  tags: InterestTag[],
  requiredPlaceActivities: number
): number {
  if (tags.length === 0 || requiredPlaceActivities === 0) return 0;
  const matching = pool.filter(
    (place) => !NON_ACTIVITY_CATEGORIES.has(place.category) && place.interests.some((tag) => tags.includes(tag))
  ).length;
  return Math.min(0.5, matching / requiredPlaceActivities);
}

function assertFeasible(
  pool: DestinationPlace[],
  durationDays: number,
  mealsPerDay: 2 | 3
): void {
  const slots = SCHEDULES[mealsPerDay];
  const details: string[] = [];
  const totalNeeded = slots.length * durationDays;
  if (pool.length < totalNeeded) {
    details.push(`تحتاج الرحلة ${totalNeeded} أماكن فريدة، والمتاح للميزانية ${pool.length}.`);
  }

  for (const slot of slots) {
    const compatible = pool.filter((place) => isCompatible(place, slot)).length;
    if (compatible < durationDays) {
      const label = slot.kind === "meal" ? slot.mealSlot : `${slot.time} (${slot.timeBlocks.join("/")})`;
      details.push(`المتاح لفئة ${label}: ${compatible}، والمطلوب ${durationDays}.`);
    }
  }

  if (details.length > 0) {
    throw new PlanningError(
      "INSUFFICIENT_KNOWLEDGE",
      "قاعدة المعرفة الحالية لا تكفي لبناء هذه الرحلة دون تكرار أو اختراع أماكن.",
      [...new Set(details)]
    );
  }
}

export function buildDraftPlan(params: GenerateTripParams): DraftPlanResult {
  if (!Number.isInteger(params.durationDays) || params.durationDays < 1 || params.durationDays > 3) {
    throw new PlanningError("INVALID_INPUT", "مدة الرحلة المدعومة حاليًا من يوم إلى ثلاثة أيام.");
  }
  const knowledge = resolveDestination(params.destination);
  if (!knowledge) {
    throw new PlanningError("UNSUPPORTED_DESTINATION", "الوجهة غير مدعومة في قاعدة معرفة Merhaal الحالية.");
  }
  if (knowledge.canonicalName !== "Riyadh" && knowledge.canonicalName !== "Jeddah") {
    throw new PlanningError("UNSUPPORTED_DESTINATION", "هذه الوجهة ستكون متاحة قريبًا.");
  }

  const durationDays = params.durationDays;
  const mealsPerDay: 2 | 3 = 2;
  const requestedBudgetTier = resolveBudgetTier(params.budgetTier);
  const travelerCount = Math.max(1, Math.min(12, Math.round(params.travelerCount)));
  const provisionalBudget = params.totalBudgetSAR ?? fallbackBudget(durationDays, requestedBudgetTier) * travelerCount;
  const budgetTier = mostConservativeTier(
    requestedBudgetTier,
    getAffordableBudgetTier(provisionalBudget, durationDays, travelerCount)
  );
  const interestTags = normalizeInterests(params.interests);
  const pool = knowledge.places.filter((place) => budgetAllowed(place, budgetTier));
  assertFeasible(pool, durationDays, mealsPerDay);

  const requiredPlaceActivities = SCHEDULES[mealsPerDay].filter((slot) => slot.kind === "place").length * durationDays;
  const context: PlanningContext = {
    knowledge,
    interestTags,
    budgetTier,
    mealsPerDay,
    minimumInterestCoverage: calculateMinimumInterestCoverage(pool, interestTags, requiredPlaceActivities),
  };
  const usedIds = new Set<string>();
  const categoryCounts = new Map<string, number>();
  const days: TripDay[] = [];

  for (let dayNumber = 1; dayNumber <= durationDays; dayNumber += 1) {
    const activities: TripActivity[] = [];
    let previous: DestinationPlace | undefined;
    for (const slot of SCHEDULES[mealsPerDay]) {
      const place = pickPlace(pool, usedIds, context, slot, categoryCounts, previous);
      if (!place) {
        throw new PlanningError(
          "INSUFFICIENT_KNOWLEDGE",
          "تعذر إكمال الجدول من الأماكن المتاحة مع احترام الوقت والوجبات.",
          [`اليوم ${dayNumber}: لا يوجد مكان فريد مناسب للفترة ${slot.startTime}-${slot.endTime}.`]
        );
      }
      usedIds.add(place.id);
      categoryCounts.set(place.category, (categoryCounts.get(place.category) ?? 0) + 1);
      activities.push(toActivity(place, slot, dayNumber, params.interests, interestTags));
      previous = place;
    }
    days.push({
      dayNumber,
      date: addDays(params.startDate!, dayNumber - 1),
      title: `اليوم ${dayNumber} في ${knowledge.arabicName}`,
      description: `برنامج متوازن مبني من قاعدة معرفة Merhaal لليوم ${dayNumber}.`,
      activities,
    });
  }

  const missingCosts = days.flatMap((day) => day.activities).some((activity) => activity.estimatedCostSAR === null);
  const totalBudgetSAR = params.totalBudgetSAR ?? fallbackBudget(durationDays, budgetTier) * travelerCount;
  const perPersonBudgetSAR = Math.round(totalBudgetSAR / travelerCount);
  const dailyPerPersonBudgetSAR = Math.round(perPersonBudgetSAR / durationDays);
  const plan: GeneratedTripPlan = {
    id: randomUUID(),
    title: `رحلة ${knowledge.arabicName} لمدة ${durationDays} ${durationDays === 1 ? "يوم" : "أيام"}`,
    destination: params.destination,
    metadata: {
      generatedAt: new Date().toISOString(),
      startDate: params.startDate!,
      endDate: addDays(params.startDate!, durationDays - 1),
      durationDays,
      engineVersion: "1.0",
    },
    preferences: {
      budgetTier: params.budgetTier,
      resolvedBudgetTier: budgetTier,
      totalBudgetSAR,
      travelerCount,
      perPersonBudgetSAR,
      dailyPerPersonBudgetSAR,
      interests: params.interests,
      interestTags,
      language: params.language,
    },
    days,
    warnings: [
      ...(requestedBudgetTier !== budgetTier
        ? ["تم ضبط مستوى الاختيارات ليتناسب مع الميزانية اليومية لكل مسافر."]
        : []),
      "مدد الزيارة والتنقل تقديرية لأن قاعدة المعرفة الحالية لا تحتوي مددًا تفصيلية أو أزمنة طرق.",
      ...(missingCosts
        ? ["لا تتوفر تكاليف موثوقة لبعض الأنشطة في قاعدة المعرفة الحالية، لذلك لم تُقدّر تكلفتها."]
        : []),
    ],
    quality: {
      score: 0,
      breakdown: {
        interestMatch: 0,
        budgetMatch: 0,
        diversity: 0,
        noDuplicates: 0,
        dailyBalance: 0,
        mealsCompliance: 0,
        timeConsistency: 0,
        knowledgeBaseCoverage: 0,
      },
    },
  };

  return { plan, context };
}
