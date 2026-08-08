import type { DestinationPlace } from "../../shared/destinationsData";
import type { GeneratedTripPlan, TripActivity } from "../../shared/tripTypes";
import type { PlanningContext } from "./engine";
import { calculateQuality } from "./quality";

export interface PlanValidationResult {
  valid: boolean;
  errors: string[];
  quality: ReturnType<typeof calculateQuality>;
}

function timeToMinutes(value: string): number | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function expectedTimeLabel(startMinutes: number): TripActivity["time"] {
  if (startMinutes < 12 * 60) return "الصباح";
  if (startMinutes < 18 * 60) return "الظهر";
  return "المساء";
}

function validateActivity(
  activity: TripActivity,
  place: DestinationPlace | undefined,
  where: string,
  errors: string[]
): void {
  if (!place) {
    errors.push(`${where}: placeId غير موجود في قاعدة المعرفة.`);
    return;
  }
  if (activity.locationName !== place.mapSearchQuery) {
    errors.push(`${where}: locationName لا يطابق المكان المرجعي.`);
  }
  if (activity.activityType !== place.category) {
    errors.push(`${where}: activityType لا يطابق تصنيف المكان.`);
  }
  if (activity.mealSlot && (place.category !== "dining" || !place.mealSlot.includes(activity.mealSlot))) {
    errors.push(`${where}: المكان لا يدعم الوجبة المحددة.`);
  }
  const start = timeToMinutes(activity.startTime);
  const end = timeToMinutes(activity.endTime);
  if (start === null || end === null) {
    errors.push(`${where}: الوقت يجب أن يكون بصيغة HH:MM.`);
    return;
  }
  if (end <= start) errors.push(`${where}: النشاط ينتهي قبل أن يبدأ أو بلا مدة.`);
  if (activity.time !== expectedTimeLabel(start)) {
    errors.push(`${where}: تصنيف الفترة لا يطابق وقت البداية.`);
  }
  if (!activity.title.trim() || !activity.description.trim() || !activity.reason.trim()) {
    errors.push(`${where}: الحقول النصية الأساسية ناقصة.`);
  }
}

export function validatePlan(plan: GeneratedTripPlan, context: PlanningContext): PlanValidationResult {
  const errors: string[] = [];
  const quality = calculateQuality(plan, context);
  const placeById = new Map(context.knowledge.places.map((place) => [place.id, place]));
  const seenPlaceIds = new Set<string>();
  const seenActivityIds = new Set<string>();
  const expectedActivities = context.mealsPerDay === 3 ? 5 : 4;

  if (plan.days.length !== plan.metadata.durationDays) {
    errors.push(`عدد الأيام ${plan.days.length} لا يطابق المدة ${plan.metadata.durationDays}.`);
  }

  plan.days.forEach((day, dayIndex) => {
    const where = `اليوم ${dayIndex + 1}`;
    if (day.dayNumber !== dayIndex + 1) errors.push(`${where}: dayNumber غير مرتب.`);
    if (day.activities.length !== expectedActivities) {
      errors.push(`${where}: المتوقع ${expectedActivities} أنشطة، الموجود ${day.activities.length}.`);
    }
    const mealCount = day.activities.filter((activity) => Boolean(activity.mealSlot)).length;
    if (mealCount !== context.mealsPerDay) {
      errors.push(`${where}: المتوقع ${context.mealsPerDay} وجبات، الموجود ${mealCount}.`);
    }

    let previousEnd: number | null = null;
    const nonMealPlaces: DestinationPlace[] = [];
    day.activities.forEach((activity, activityIndex) => {
      const activityWhere = `${where}، النشاط ${activityIndex + 1}`;
      const place = placeById.get(activity.placeId);
      validateActivity(activity, place, activityWhere, errors);
      if (seenPlaceIds.has(activity.placeId)) errors.push(`${activityWhere}: مكان مكرر.`);
      if (seenActivityIds.has(activity.id)) errors.push(`${activityWhere}: معرف نشاط مكرر.`);
      seenPlaceIds.add(activity.placeId);
      seenActivityIds.add(activity.id);
      if (place && !activity.mealSlot) nonMealPlaces.push(place);

      const start = timeToMinutes(activity.startTime);
      const end = timeToMinutes(activity.endTime);
      if (start !== null && previousEnd !== null) {
        if (start < previousEnd) errors.push(`${activityWhere}: النشاط متداخل مع النشاط السابق.`);
        if (start - previousEnd > 180) errors.push(`${activityWhere}: فجوة زمنية تتجاوز ثلاث ساعات.`);
      }
      if (end !== null) previousEnd = end;
    });

    if (nonMealPlaces.length > 1 && new Set(nonMealPlaces.map((place) => place.category)).size === 1) {
      const preferenceJustifiesCategory = nonMealPlaces.every((place) =>
        place.interests.some((tag) => context.interestTags.includes(tag))
      );
      if (!preferenceJustifiesCategory) errors.push(`${where}: تكرار غير مبرر لنوع النشاط نفسه.`);
    }
  });

  const actualInterestCoverage = quality.breakdown.interestMatch / 100;
  if (context.interestTags.length > 0 && actualInterestCoverage + 0.001 < context.minimumInterestCoverage) {
    errors.push(
      `تغطية الاهتمامات ${(actualInterestCoverage * 100).toFixed(0)}% أقل من الحد الممكن المطلوب ${(context.minimumInterestCoverage * 100).toFixed(0)}%.`
    );
  }
  if (quality.breakdown.budgetMatch < 100) errors.push("توجد أماكن غير متوافقة مع مستوى الميزانية.");
  if (quality.breakdown.knowledgeBaseCoverage < 100) errors.push("توجد أماكن خارج قاعدة المعرفة.");
  if (quality.breakdown.noDuplicates < 100) errors.push("الخطة تحتوي أماكن مكررة.");
  if (quality.breakdown.mealsCompliance < 100) errors.push("عدد الوجبات غير مطابق في جميع الأيام.");
  if (quality.breakdown.timeConsistency < 100) errors.push("تسلسل الأوقات غير صالح.");

  return { valid: errors.length === 0, errors: [...new Set(errors)], quality };
}

function immutableShape(plan: GeneratedTripPlan): unknown {
  return {
    id: plan.id,
    destination: plan.destination,
    metadata: plan.metadata,
    preferences: plan.preferences,
    warnings: plan.warnings,
    days: plan.days.map((day) => ({
      dayNumber: day.dayNumber,
      date: day.date,
      activities: day.activities.map((activity) => ({
        id: activity.id,
        placeId: activity.placeId,
        activityType: activity.activityType,
        mealSlot: activity.mealSlot,
        time: activity.time,
        startTime: activity.startTime,
        endTime: activity.endTime,
        locationName: activity.locationName,
        bookingSearchQuery: activity.bookingSearchQuery,
        estimatedCostSAR: activity.estimatedCostSAR,
      })),
    })),
  };
}

export function validateImmutableFields(draft: GeneratedTripPlan, enriched: GeneratedTripPlan): string[] {
  return JSON.stringify(immutableShape(draft)) === JSON.stringify(immutableShape(enriched))
    ? []
    : ["غيّرت طبقة الذكاء الاصطناعي حقول التخطيط الثابتة."];
}
