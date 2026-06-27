import OpenAI from "openai";
import {
  normalizeInterests,
  normalizeText,
  resolveBudgetTier,
  resolveDestination,
  type BudgetTier,
  type DestinationKnowledge,
  type DestinationPlace,
  type InterestTag,
  type MealSlot,
  type TimeBlock,
} from "@/lib/destinationsData";

export type TripActivityTime = "الصباح" | "الظهر" | "المساء";

export interface TripActivity {
  time: TripActivityTime;
  startTime: string;
  endTime: string;
  title: string;
  description: string;
  locationName: string;
  bookingSearchQuery: string;
}

export interface TripDay {
  dayNumber: number;
  activities: TripActivity[];
}

export interface TripHotel {
  name: string;
  description: string;
  bookingUrl: string;
}

export interface GeneratedTripPlan {
  id: string;
  title: string;
  destination: string;
  hotel?: TripHotel;
  days: TripDay[];
}

export type OutputLanguage = "ar" | "en";

/** Strict budget/style tiers shown to the user. */
export type ArabicBudgetTier = "اقتصادية" | "متوسطة" | "فاخرة";
export const BUDGET_TIER_OPTIONS: ArabicBudgetTier[] = [
  "اقتصادية",
  "متوسطة",
  "فاخرة",
];

/** Strict trip "moods" replacing free-form interests. */
export type TripMood =
  | "عريق وتراثي"
  | "ترند ولايف ستايل"
  | "استرخاء وطبيعة"
  | "حيوية وترفيه";
export const TRIP_MOOD_OPTIONS: TripMood[] = [
  "عريق وتراثي",
  "ترند ولايف ستايل",
  "استرخاء وطبيعة",
  "حيوية وترفيه",
];

export interface GenerateTripParams {
  destination: string;
  /** Constrained to 1..7 by the UI. */
  durationDays: number;
  budgetTier: ArabicBudgetTier;
  totalBudgetSAR?: number;
  accommodationType?: ArabicBudgetTier;
  mealsPerDay?: 2 | 3;
  interests: TripMood[];
  language: OutputLanguage;
  startDate?: string;
}

export type CityName = "الرياض" | "جدة" | "الطائف" | "أبها" | "العلا";

export interface NormalizedTripInputs {
  city: CityName;
  startDate: string;
  durationDays: number;
  totalBudgetSAR: number;
  dailyBudgetSAR: number;
  budgetTier: BudgetTier;
  accommodationType: BudgetTier;
  mealsPerDay: 2 | 3;
  moods: TripMood[];
  language: OutputLanguage;
}

export interface ScoredPlace {
  place: DestinationPlace;
  score: number;
}

export interface DayCandidates {
  dayNumber: number;
  الصباح: DestinationPlace[];
  الظهر: DestinationPlace[];
  المساء: DestinationPlace[];
}

const MODEL = "llama-3.3-70b-versatile";
const MIN_LOCATION_LENGTH = 4;
const MAX_PROMPT_PLACES = 35;
const MAX_BLOCK_CANDIDATES = 3;
const MAX_DAILY_RESTAURANTS = 5;
const VALID_TIMES: TripActivityTime[] = ["الصباح", "الظهر", "المساء"];
// Foreign scripts (Chinese/CJK and Cyrillic) that must never appear in generated
// Arabic/English text. Arabic + Latin are the only allowed scripts.
const FOREIGN_SCRIPT_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf\u0400-\u04ff]/;

function getGroqApiKey(): string {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  if (import.meta.env.DEV) {
    console.info("[Groq] env check", {
      mode: import.meta.env.MODE,
      hasViteGroqKey: Boolean(apiKey),
      keyLength: typeof apiKey === "string" ? apiKey.length : 0,
    });
  }

  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    console.error("[Groq] VITE_GROQ_API_KEY is missing or empty", {
      availableEnvKeys: Object.keys(import.meta.env).filter((k) => k.startsWith("VITE_")),
    });
    throw new Error("MISSING_API_KEY");
  }

  return apiKey.trim();
}

function getGroqClient(): OpenAI {
  return new OpenAI({
    apiKey: getGroqApiKey(),
    baseURL: "https://api.groq.com/openai/v1",
    dangerouslyAllowBrowser: true,
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

export function formatLlmError(error: unknown, language: OutputLanguage): string {
  const message = getErrorMessage(error);
  const lower = message.toLowerCase();

  if (
    message === "MISSING_API_KEY" ||
    lower.includes("vite_groq_api_key") ||
    lower.includes("غير مُعرَّف")
  ) {
    return language === "ar"
      ? "مفتاح Groq غير مُعرَّف. أضف VITE_GROQ_API_KEY في إعدادات النشر أو ملف .env المحلي."
      : "Groq API key is missing. Set VITE_GROQ_API_KEY in your deploy settings or local .env file.";
  }

  if (message === "POOR_QUALITY") {
    return language === "ar"
      ? "تعذّر إنشاء خطة بالجودة المطلوبة. حاول مرة أخرى أو عدّل خياراتك."
      : "Could not produce a high-quality plan. Please try again or adjust your choices.";
  }

  if (
    lower.includes("api key not valid") ||
    lower.includes("invalid api key") ||
    lower.includes("incorrect api key") ||
    lower.includes("unauthorized") ||
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("permission denied") ||
    lower.includes("authentication")
  ) {
    return language === "ar"
      ? `خطأ في مصادقة Groq: المفتاح غير صالح أو منتهي. (${message})`
      : `Groq authentication error: invalid or expired API key. (${message})`;
  }

  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network error") ||
    lower.includes("fetch failed") ||
    lower.includes("err_connection") ||
    lower.includes("cors")
  ) {
    return language === "ar"
      ? `خطأ في الشبكة أثناء الاتصال بـ Groq. تحقق من الإنترنت وحاول مجددًا. (${message})`
      : `Network error while contacting Groq. Check your connection and try again. (${message})`;
  }

  if (
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("429") ||
    lower.includes("resource exhausted")
  ) {
    return language === "ar"
      ? `تم تجاوز حد استخدام Groq. حاول لاحقًا. (${message})`
      : `Groq quota or rate limit exceeded. Try again later. (${message})`;
  }

  if (
    lower.includes("json") ||
    lower.includes("تنسيق الخطة") ||
    lower.includes("syntaxerror")
  ) {
    return language === "ar"
      ? `تعذّر قراءة استجابة الذكاء الاصطناعي. (${message})`
      : `Could not parse the AI response. (${message})`;
  }

  return language === "ar"
    ? `تعذّر توليد الخطة: ${message}`
    : `Could not generate the plan: ${message}`;
}

function logLlmError(context: string, error: unknown): void {
  console.error(`[Groq] ${context}`, error);
  if (error && typeof error === "object") {
    console.error(`[Groq] ${context} (serialized)`, {
      ...error,
      message: getErrorMessage(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

function isRateLimitError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  const status = error && typeof error === "object" && "status" in error ? (error as { status?: unknown }).status : undefined;
  return status === 429 || message.includes("429") || message.includes("rate limit");
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRateLimitRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isRateLimitError(error)) throw error;
    console.warn("[Groq] rate limit hit, retrying once in 6s");
    await wait(6000);
    return operation();
  }
}

function stripMarkdownJson(raw: string): string {
  return raw.replace(/```json/gi, "").replace(/```/g, "").trim();
}

function toArabicBudgetTier(tier: string | undefined): ArabicBudgetTier {
  const normalized = resolveBudgetTier(tier || "متوسطة");
  if (normalized === "budget") return "اقتصادية";
  if (normalized === "luxury") return "فاخرة";
  return "متوسطة";
}

function toCityName(destination: string): CityName {
  const resolved = resolveDestination(destination);
  const city = resolved?.arabicName;
  if (city === "الرياض" || city === "جدة" || city === "الطائف" || city === "أبها" || city === "العلا") {
    return city;
  }
  return "الرياض";
}

export function getBudgetTier(
  totalBudgetSAR: number,
  durationDays: number,
  accommodationType: string,
  mealsPerDay: 2 | 3
): BudgetTier {
  const days = Math.max(1, Math.min(7, Math.round(durationDays || 1)));
  const total = Math.max(0, Number(totalBudgetSAR) || 0);
  const dailyBudgetSAR = total / days;
  const accommodation = resolveBudgetTier(accommodationType);
  const accommodationLoad = accommodation === "luxury" ? 900 : accommodation === "midRange" ? 450 : 180;
  const mealsLoad = mealsPerDay === 3 ? 260 : 180;
  const discretionary = dailyBudgetSAR - accommodationLoad - mealsLoad;

  if (dailyBudgetSAR >= 3000 || discretionary >= 1400) return "luxury";
  if (dailyBudgetSAR >= 850 || discretionary >= 250) return "midRange";
  return "budget";
}

export function normalizeTripInputs(rawInputs: GenerateTripParams): NormalizedTripInputs {
  const durationDays = Math.max(1, Math.min(7, Math.round(rawInputs.durationDays || 1)));
  const accommodationTier = resolveBudgetTier(rawInputs.accommodationType || rawInputs.budgetTier);
  const mealsPerDay: 2 | 3 = rawInputs.mealsPerDay === 3 ? 3 : 2;
  const fallbackDailyBudget =
    accommodationTier === "luxury" ? 3200 : accommodationTier === "midRange" ? 1000 : 450;
  const totalBudgetSAR =
    typeof rawInputs.totalBudgetSAR === "number" && rawInputs.totalBudgetSAR > 0
      ? rawInputs.totalBudgetSAR
      : fallbackDailyBudget * durationDays;
  const dailyBudgetSAR = Math.round(totalBudgetSAR / durationDays);

  return {
    city: toCityName(rawInputs.destination),
    startDate: rawInputs.startDate || "",
    durationDays,
    totalBudgetSAR,
    dailyBudgetSAR,
    budgetTier: getBudgetTier(
      totalBudgetSAR,
      durationDays,
      rawInputs.accommodationType || rawInputs.budgetTier,
      mealsPerDay
    ),
    accommodationType: accommodationTier,
    mealsPerDay,
    moods: rawInputs.interests,
    language: rawInputs.language,
  };
}

function moodTags(moods: TripMood[]): InterestTag[] {
  return normalizeInterests(moods);
}

function budgetAllowed(place: DestinationPlace, tier: BudgetTier): boolean {
  if (place.budgetLevel.includes(tier)) return true;
  if (tier === "luxury" && place.budgetLevel.includes("midRange")) return place.priorityScore >= 70;
  if (tier === "midRange" && place.budgetLevel.includes("budget")) return place.priorityScore >= 70;
  return false;
}

export function filterPlaces(
  city: CityName,
  budgetTier: BudgetTier,
  moods: TripMood[]
): DestinationPlace[] {
  const knowledge = resolveDestination(city);
  if (!knowledge) return [];
  const tags = moodTags(moods);

  return knowledge.places
    .filter((place) => {
      const matchesMood =
        tags.length === 0 || place.interests.some((interest) => tags.includes(interest));
      return matchesMood && budgetAllowed(place, budgetTier);
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

function timeBlockMatches(place: DestinationPlace, block?: TimeBlock): number {
  if (!block) return 0;
  return place.recommendedTime.includes(block) ? 10 : -4;
}

function mealSlotMatches(place: DestinationPlace, mealSlot?: MealSlot): number {
  if (!mealSlot || mealSlot === "لا ينطبق") return 0;
  return place.mealSlot.includes(mealSlot) ? 10 : place.mealSlot.includes("لا ينطبق") ? -3 : 0;
}

export function scorePlaces(
  places: DestinationPlace[],
  context: NormalizedTripInputs & { timeBlock?: TimeBlock; mealSlot?: MealSlot }
): ScoredPlace[] {
  const tags = moodTags(context.moods);
  const isFamily = tags.includes("family") || tags.includes("kids");

  return places
    .map((place) => {
      let score = place.priorityScore;
      score += place.budgetLevel.includes(context.budgetTier) ? 18 : 4;
      score += place.interests.filter((interest) => tags.includes(interest)).length * 10;
      score += timeBlockMatches(place, context.timeBlock);
      score += mealSlotMatches(place, context.mealSlot);
      if (context.budgetTier === "luxury") score += place.luxuryScore * 2;
      if (context.moods.includes("ترند ولايف ستايل")) score += place.trendScore * 2;
      if (context.moods.includes("عريق وتراثي")) score += place.localAuthenticityScore * 2;
      if (isFamily) score += place.familyFriendlyScore * 2;
      if (context.timeBlock === "afternoon" && place.weatherSensitivity === "داخلي ومناسب للحر") {
        score += 12;
      }
      if (context.timeBlock === "afternoon" && place.weatherSensitivity === "تجنب وقت الظهر") {
        score -= 12;
      }
      return { place, score };
    })
    .sort((a, b) => b.score - a.score);
}

function uniquePlaces(places: DestinationPlace[]): DestinationPlace[] {
  const seen = new Set<string>();
  return places.filter((place) => {
    if (seen.has(place.id)) return false;
    seen.add(place.id);
    return true;
  });
}

export function buildDayCandidates(
  scoredPlaces: ScoredPlace[],
  context: NormalizedTripInputs
): DayCandidates[] {
  const unused = [...scoredPlaces.map((p) => p.place)];
  const days: DayCandidates[] = [];
  const injectedPlaceIds = new Set<string>();
  const maxPlacesPerDay = Math.max(
    4,
    Math.floor(MAX_PROMPT_PLACES / Math.max(1, context.durationDays))
  );

  const takeBlockCandidates = (
    places: DestinationPlace[],
    limit: number,
    remainingGlobalSlots: number
  ): DestinationPlace[] => {
    const selected: DestinationPlace[] = [];
    for (const place of places) {
      if (selected.length >= limit || selected.length >= remainingGlobalSlots) break;
      if (injectedPlaceIds.has(place.id)) continue;
      selected.push(place);
      injectedPlaceIds.add(place.id);
    }
    return selected;
  };

  for (let day = 1; day <= context.durationDays; day += 1) {
    const remainingGlobalSlots = MAX_PROMPT_PLACES - injectedPlaceIds.size;
    if (remainingGlobalSlots <= 0) {
      days.push({ dayNumber: day, الصباح: [], الظهر: [], المساء: [] });
      continue;
    }

    const dailyLimit = Math.min(maxPlacesPerDay, remainingGlobalSlots);
    const morningPool = scorePlaces(unused, { ...context, timeBlock: "morning" })
      .filter(({ place }) =>
        ["heritage", "nature", "cafe", "modern"].includes(place.category)
      )
      .map(({ place }) => place);
    const afternoonMeal: MealSlot = context.mealsPerDay === 3 ? "غداء" : "غداء";
    const afternoonPool = scorePlaces(unused, {
      ...context,
      timeBlock: "afternoon",
      mealSlot: afternoonMeal,
    })
      .filter(({ place }) =>
        ["dining", "cafe", "heritage", "shopping", "family", "modern"].includes(place.category)
      )
      .map(({ place }) => place);
    const eveningPool = scorePlaces(unused, { ...context, timeBlock: "evening", mealSlot: "عشاء" })
      .filter(({ place }) =>
        ["dining", "cafe", "luxury", "entertainment", "shopping", "nature", "modern"].includes(
          place.category
        )
      )
      .map(({ place }) => place);

    const morningLimit = Math.min(MAX_BLOCK_CANDIDATES, Math.max(1, dailyLimit - 4));
    const afternoonLimit = Math.min(MAX_BLOCK_CANDIDATES, Math.max(1, dailyLimit - morningLimit - 2));
    const eveningLimit = Math.min(MAX_BLOCK_CANDIDATES, Math.max(1, dailyLimit - morningLimit - afternoonLimit));

    const morning = takeBlockCandidates(morningPool, morningLimit, MAX_PROMPT_PLACES - injectedPlaceIds.size);
    const afternoon = takeBlockCandidates(
      afternoonPool,
      afternoonLimit,
      MAX_PROMPT_PLACES - injectedPlaceIds.size
    );
    const evening = takeBlockCandidates(eveningPool, eveningLimit, MAX_PROMPT_PLACES - injectedPlaceIds.size);

    const restaurants = uniquePlaces([...afternoon, ...evening]).filter(
      (place) => place.category === "dining" || place.category === "cafe"
    );
    if (restaurants.length > MAX_DAILY_RESTAURANTS) {
      const allowedRestaurantIds = new Set(restaurants.slice(0, MAX_DAILY_RESTAURANTS).map((place) => place.id));
      for (const place of [...afternoon, ...evening]) {
        if (
          (place.category === "dining" || place.category === "cafe") &&
          !allowedRestaurantIds.has(place.id)
        ) {
          injectedPlaceIds.delete(place.id);
        }
      }
    }

    const cappedAfternoon = afternoon.filter(
      (place) =>
        place.category !== "dining" &&
        place.category !== "cafe" ||
        restaurants.slice(0, MAX_DAILY_RESTAURANTS).some((restaurant) => restaurant.id === place.id)
    );
    const cappedEvening = evening.filter(
      (place) =>
        place.category !== "dining" &&
        place.category !== "cafe" ||
        restaurants.slice(0, MAX_DAILY_RESTAURANTS).some((restaurant) => restaurant.id === place.id)
    );

    const selected = uniquePlaces([...morning, ...cappedAfternoon, ...cappedEvening]);
    for (const place of selected) {
      const index = unused.findIndex((candidate) => candidate.id === place.id);
      if (index >= 0) unused.splice(index, 1);
    }

    days.push({
      dayNumber: day,
      الصباح: morning,
      الظهر: cappedAfternoon,
      المساء: cappedEvening,
    });
  }

  return days;
}

function getCandidateDurationMinutes(place: DestinationPlace): number {
  if (place.category === "cafe") return 90;
  if (place.category === "dining") return 120;
  if (place.category === "shopping" || place.category === "entertainment") return 180;
  if (place.category === "nature" || place.category === "heritage") return 150;
  return 120;
}

function getCandidateCostTier(place: DestinationPlace): ArabicBudgetTier {
  if (place.budgetLevel.includes("luxury")) return "فاخرة";
  if (place.budgetLevel.includes("midRange")) return "متوسطة";
  return "اقتصادية";
}

function isBookingRequired(place: DestinationPlace): boolean {
  return place.bookingDifficulty === "الحجز ضروري" || place.bookingDifficulty === "تذاكر مسبقة";
}

function getBriefDetails(place: DestinationPlace): string {
  const details = place.shortDescription.replace(/\s+/g, " ").trim();
  return details.length > 90 ? `${details.slice(0, 87)}...` : details;
}

function formatCandidate(place: DestinationPlace) {
  return {
    id: place.id,
    name: place.mapSearchQuery || place.name,
    type: place.category,
    durationMinutes: getCandidateDurationMinutes(place),
    costTier: getCandidateCostTier(place),
    requiresBooking: isBookingRequired(place),
    details: getBriefDetails(place),
  };
}

function getAllowedPlacesFromDays(days: DayCandidates[]): DestinationPlace[] {
  return uniquePlaces(days.flatMap((day) => [...day.الصباح, ...day.الظهر, ...day.المساء]));
}

function describeInterests(params: GenerateTripParams): string {
  if (!params.interests.length) {
    return params.language === "ar" ? "عام (بدون تفضيل محدد)" : "general (no specific preference)";
  }
  return params.interests.join(params.language === "ar" ? "، " : ", ");
}

export function buildSystemPrompt(params: GenerateTripParams, dayCandidates?: DayCandidates[]): string {
  const normalized = normalizeTripInputs(params);
  const candidates =
    dayCandidates ??
    buildDayCandidates(
      scorePlaces(filterPlaces(normalized.city, normalized.budgetTier, normalized.moods), normalized),
      normalized
    );
  const candidatePayload = JSON.stringify(
    candidates.map((day) => ({
      d: day.dayNumber,
      m: day.الصباح.map(formatCandidate),
      a: day.الظهر.map(formatCandidate),
      e: day.المساء.map(formatCandidate),
    }))
  );
  const budgetTier = normalized.budgetTier;
  const interestTags = normalizeInterests(params.interests);
  const languageName = params.language === "ar" ? "Arabic" : "English";

  const moodList = describeInterests(params);
  const styleVoice =
    params.language === "ar"
      ? "اكتب بعربية أنيقة وراقية وشاعرية بأسلوب يشبه كتابة Apple."
      : "Write in elegant, premium, slightly poetic travel English (Apple-like copywriting).";

  return `<role>
You are an elite, highly sought-after Saudi Travel Concierge. Your tone is premium, welcoming, and poetic (Apple-like Arabic copywriting). ${styleVoice} Your mission is to design a ${params.durationDays}-day luxury itinerary for ${params.destination}. The entire output language MUST be ${languageName}.
</role>

<user_profile>
- Destination: ${normalized.city}
- Duration: ${normalized.durationDays} day(s)
- Start date: ${normalized.startDate || "not specified"}
- Total trip budget SAR: ${normalized.totalBudgetSAR}
- Daily budget estimate SAR: ${normalized.dailyBudgetSAR}
- Budget & Style: ${params.budgetTier} (internal tier: ${budgetTier})
- Accommodation type: ${normalized.accommodationType}
- Meals per day: ${normalized.mealsPerDay}
- Vibe & Moods: ${moodList}${interestTags.length ? ` (tags: ${interestTags.join(", ")})` : ""}
</user_profile>

<allowed_candidate_places>
CRITICAL: These are the ONLY locations you may use. Do not use the full knowledge base. Do not invent any location. Every activity.locationName MUST exactly match one provided candidate.name. Candidate keys: d=day, m=morning, a=afternoon, e=evening.
${candidatePayload}
</allowed_candidate_places>

<strict_time_and_logic_laws>
CRITICAL: You must obey the physics of time and the reality of Saudi tourism.
1. MORNINGS (08:00 - 12:00) -> time = "الصباح": select from that day's "m" candidates only. Prefer heritage, nature, scenic starts, iconic landmarks, or breakfast/brunch cafes. NEVER schedule entertainment zones or malls here.
2. AFTERNOONS (12:00 - 17:00) -> time = "الظهر": select from that day's "a" candidates only. Prefer indoor/shaded activities, premium lunches, museums, malls, or relaxed walks.
3. EVENINGS/NIGHTS (17:00 - 23:59) -> time = "المساء": select from that day's "e" candidates only. This is when you schedule trendy/lifestyle, entertainment, fine dining, waterfronts, viewpoints, and premium areas.
4. NO DEAD TIME: the gap between the END of one activity and the START of the next MUST NOT exceed 3 hours (180 min). Keep only realistic transitions (~20-45 min). If one ends at 11:30, the next must start by 14:30 at the latest.
5. DENSITY: provide EXACTLY 4 to 5 activities per day — never fewer than 4 and never more than 5.
6. CLOCK FIELDS: every activity MUST have 24-hour "startTime" and "endTime" ("HH:MM"), chronological and non-overlapping, with "time" matching the block above. Realistic durations: heritage/museum ~1.5-2.5h, coffee ~45-60min, lunch ~1-1.5h, dinner ~1.5-2h, major attraction ~2-3h.
7. ASYMMETRIC PACING: do NOT reuse an identical daily template — vary start times and mood (e.g. one day ends late at a trendy cafe, another starts early for heritage). Never repeat the same place across days unless duration forces it.
</strict_time_and_logic_laws>

<style_mapping_laws>
Match the places to "${params.budgetTier}":
- If "فاخرة" (Luxury): 5-star hotels, fine dining (Myazu, Suhail, San Carlo Cicchetti), and VIP experiences (VIA Riyadh, Bujairi Terrace, Maraya, Jeddah Yacht Club).
- If "متوسطة" (Mid-range): 4-star hotels, highly-rated trendy casual spots (Sign Burger, Elan Cafe, AOK Kitchen), and paid entertainment.
- If "اقتصادية" (Budget): practical hotels, free outdoor parks and nature, local heritage, and affordable popular food.
</style_mapping_laws>

<dining_laws>
Respect mealsPerDay = ${normalized.mealsPerDay}. If 2, include exactly two meal activities per day (usually غداء + عشاء). If 3, include exactly three meal activities per day (فطور + غداء + عشاء). A coffee stop may be included when it does not replace the required meal count. All dining/coffee must come from the allowed candidates.
</dining_laws>

<accommodation_law>
Select ONE real, well-known hotel in ${params.destination} matching "${params.budgetTier}" (فاخرة -> 5-star landmark; متوسطة -> solid 4-star; اقتصادية -> reputable 3-star/economy). Return it as the root "hotel" object with "name", "description" (one concrete sentence in ${languageName}), and "bookingUrl" formatted EXACTLY as a Booking.com search link: "https://www.booking.com/searchresults.html?ss=" + hotel name + destination, URL-encoded with "+" between words (e.g. "https://www.booking.com/searchresults.html?ss=Fairmont+Riyadh+Riyadh").
</accommodation_law>

<language_laws>
Output language: ${languageName}. ${
    params.language === "ar"
      ? "Use polished, 100% pure natural Arabic."
      : "Use clear, premium travel English."
  }
STRICT NEGATIVE CONSTRAINT: NEVER output or mix in Chinese characters (e.g. "开始"), Cyrillic, or stray words from other languages in "title" or "description" — except real brand/place names (e.g. "VIA Riyadh", "Bujairi Terrace"). "locationName" must be a precise, copy-paste-able Google Maps name; in Arabic you may append the English map name, e.g. "مطل البجيري - Bujairi Terrace, Diriyah".
</language_laws>

<output_requirements>
Write each "description" beautifully and specifically — make the user FEEL the luxury and understand WHY this place, at this time, for this budget. Do NOT write flat lines like "Visit the museum"; instead, e.g. "انغمس في عبق التاريخ واستكشف جذور المملكة في...". Avoid generic phrases (مطعم محلي، سوق شعبي، منطقة ترفيهية، local restaurant, tourist attraction, hidden gem). Each description must be at least one rich sentence.
Output ONLY valid JSON (no markdown, no commentary) matching this schema exactly:
{
  "id": "will_be_generated",
  "title": "String",
  "destination": "String",
  "hotel": { "name": "String", "description": "String", "bookingUrl": "String" },
  "days": [
    {
      "dayNumber": 1,
      "activities": [
        { "time": "الصباح" | "الظهر" | "المساء", "startTime": "09:00", "endTime": "11:30", "title": "String", "description": "String", "locationName": "String", "bookingSearchQuery": "String" }
      ]
    }
  ]
}
Rules: "time" is exactly one of "الصباح", "الظهر", "المساء". 4-5 activities per day (never fewer than 4). bookingSearchQuery is a clean search string for booking/affiliate links.
</output_requirements>`;
}

function buildUserPrompt(params: GenerateTripParams): string {
  return `Create a ${params.durationDays}-day itinerary for ${params.destination}.
Set "id" to "will_be_generated" and "destination" to "${params.destination}".
Return JSON only.`;
}

export interface ItineraryValidationContext {
  language: OutputLanguage;
  knowledge: DestinationKnowledge | null;
  durationDays: number;
  normalized?: NormalizedTripInputs;
  allowedPlaces?: DestinationPlace[];
}

export interface ItineraryValidationResult {
  valid: boolean;
  errors: string[];
}

function normalizeLocationForMatch(value: string): string {
  return normalizeText(value)
    .replace(/\b(مطعم|مقهى|كافيه|كوفي|محمصه|محمصة|roasters|restaurant|cafe|coffee|house)\b/g, "")
    .replace(/\s+/g, "");
}

function fuzzyLocationMatches(value: string, candidate: string): boolean {
  const normalizedValue = normalizeLocationForMatch(value);
  const normalizedCandidate = normalizeLocationForMatch(candidate);
  if (!normalizedValue || !normalizedCandidate) return false;
  return (
    normalizedValue === normalizedCandidate ||
    normalizedValue.includes(normalizedCandidate) ||
    normalizedCandidate.includes(normalizedValue)
  );
}

function isAllowedLocation(locationName: string, allowedPlaces: DestinationPlace[]): boolean {
  return allowedPlaces.some((place) =>
    [place.name, place.arabicName, place.englishName, place.mapSearchQuery]
      .some((candidate) => fuzzyLocationMatches(locationName, candidate))
  );
}

/**
 * Validate a generated itinerary against the schema, content-quality rules, and
 * (when available) the curated destination knowledge. Pure and side-effect free.
 */
export function validateGeneratedItinerary(
  itinerary: unknown,
  context: ItineraryValidationContext
): ItineraryValidationResult {
  const errors: string[] = [];

  if (!itinerary || typeof itinerary !== "object") {
    return { valid: false, errors: ["Output is not a JSON object."] };
  }

  const plan = itinerary as Partial<GeneratedTripPlan>;

  if (!plan.title || typeof plan.title !== "string" || !plan.title.trim()) {
    errors.push("Missing or empty 'title'.");
  }
  if (!plan.destination || typeof plan.destination !== "string" || !plan.destination.trim()) {
    errors.push("Missing or empty 'destination'.");
  }
  if (!Array.isArray(plan.days) || plan.days.length === 0) {
    errors.push("Missing or empty 'days' array.");
    return { valid: false, errors };
  }
  if (plan.days.length !== context.durationDays) {
    errors.push(`Expected ${context.durationDays} days, got ${plan.days.length}.`);
  }

  const seenLocations = new Map<string, number>();

  plan.days.forEach((day, dayIdx) => {
    const dayLabel = `Day ${day?.dayNumber ?? dayIdx + 1}`;
    if (!day || !Array.isArray(day.activities) || day.activities.length === 0) {
      errors.push(`${dayLabel}: has no activities.`);
      return;
    }

    day.activities.forEach((activity, actIdx) => {
      const where = `${dayLabel} activity ${actIdx + 1}`;

      if (!activity || typeof activity !== "object") {
        errors.push(`${where}: is not a valid object.`);
        return;
      }

      if (!VALID_TIMES.includes(activity.time)) {
        errors.push(`${where}: invalid 'time' value "${String(activity.time)}".`);
      }

      if (typeof activity.startTime !== "string" || !activity.startTime.trim()) {
        errors.push(`${where}: missing or invalid 'startTime' (expected "HH:MM").`);
      }
      if (typeof activity.endTime !== "string" || !activity.endTime.trim()) {
        errors.push(`${where}: missing or invalid 'endTime' (expected "HH:MM").`);
      }

      if (!activity.title || !activity.title.trim()) {
        errors.push(`${where}: empty 'title'.`);
      }

      const location = (activity.locationName || "").trim();
      if (!location) {
        errors.push(`${where}: empty 'locationName'.`);
      } else if (location.length < MIN_LOCATION_LENGTH) {
        errors.push(`${where}: 'locationName' is too short to be precise ("${location}").`);
      }

      if (!activity.description || typeof activity.description !== "string") {
        errors.push(`${where}: missing 'description'.`);
      }

      if (FOREIGN_SCRIPT_REGEX.test(activity.title || "") || FOREIGN_SCRIPT_REGEX.test(activity.description || "")) {
        errors.push(
          `${where}: hallucinated foreign (Chinese/Cyrillic) characters detected. Use ONLY the requested language.`
        );
      }

      if (location) {
        const key = normalizeText(location);
        seenLocations.set(key, (seenLocations.get(key) || 0) + 1);

        if (context.allowedPlaces?.length && !isAllowedLocation(location, context.allowedPlaces)) {
          errors.push(`${where}: location "${location}" is not in the allowed candidate places.`);
        }
      }
    });
  });

  // Repeated locations are a quality issue, not a blocker. Log only.
  for (const [key, count] of seenLocations) {
    if (count > 1) {
      console.warn(`[Groq] repeated itinerary location (non-blocking): "${key}" appears ${count} times.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

async function requestItinerary(
  client: OpenAI,
  systemPrompt: string,
  userPrompt: string
): Promise<GeneratedTripPlan> {
  const completion = await withRateLimitRetry(() =>
    client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    })
  );

  const rawText = completion.choices[0]?.message?.content;
  if (!rawText) {
    throw new Error("لم يتم استلام رد من الذكاء الاصطناعي");
  }

  try {
    return JSON.parse(stripMarkdownJson(rawText)) as GeneratedTripPlan;
  } catch (parseError) {
    logLlmError("JSON parse failed", parseError);
    console.error("[Groq] raw model response", rawText);
    throw new Error(
      parseError instanceof Error
        ? `JSON parse error: ${parseError.message}`
        : "JSON parse error"
    );
  }
}

/**
 * Attempt exactly one stricter repair pass, passing the validation errors back to
 * the model. Returns the repaired plan (still requires re-validation by the caller).
 */
export async function repairGeneratedItineraryIfNeeded(
  client: OpenAI,
  params: GenerateTripParams,
  validationErrors: string[],
  dayCandidates: DayCandidates[]
): Promise<GeneratedTripPlan> {
  const systemPrompt = buildSystemPrompt(params, dayCandidates);
  const repairPrompt = `Your previous itinerary was REJECTED for these reasons:
${validationErrors.map((e) => `- ${e}`).join("\n")}

Fix ONLY invalid fields. Do not change valid logistics unless required by the errors.
Use ONLY the allowed candidate places in the system prompt.
Every locationName must exactly match an allowed candidate name, arabicName, or mapSearchQuery.
Return the FULL itinerary as JSON only.`;

  return requestItinerary(client, systemPrompt, repairPrompt);
}

export async function generateTrip(params: GenerateTripParams): Promise<GeneratedTripPlan> {
  try {
    const client = getGroqClient();
    const normalized = normalizeTripInputs(params);
    const knowledge = resolveDestination(normalized.city);
    const filteredPlaces = filterPlaces(normalized.city, normalized.budgetTier, normalized.moods);
    const scoredPlaces = scorePlaces(filteredPlaces, normalized);
    const dayCandidates = buildDayCandidates(scoredPlaces, normalized);
    const allowedPlaces = getAllowedPlacesFromDays(dayCandidates);
    const context: ItineraryValidationContext = {
      language: params.language,
      knowledge,
      durationDays: normalized.durationDays,
      normalized,
      allowedPlaces,
    };

    const systemPrompt = buildSystemPrompt(params, dayCandidates);
    const userPrompt = buildUserPrompt(params);

    let plan = await requestItinerary(client, systemPrompt, userPrompt);
    let result = validateGeneratedItinerary(plan, context);

    if (!result.valid) {
      console.warn("[Groq] itinerary validation failed, attempting repair", result.errors);
      console.error("🚨 Itinerary Validation Failed:", result.errors);
      try {
        await wait(4000);
        const repaired = await repairGeneratedItineraryIfNeeded(client, params, result.errors, dayCandidates);
        const repairedResult = validateGeneratedItinerary(repaired, context);
        if (repairedResult.valid) {
          plan = repaired;
          result = repairedResult;
        } else {
          console.error("[Groq] repair still invalid", repairedResult.errors);
          console.error("🚨 Itinerary Validation Failed:", repairedResult.errors);
          throw new Error("POOR_QUALITY");
        }
      } catch (repairError) {
        console.error("🚨 Itinerary Validation Failed:", repairError);
        if (repairError instanceof Error && repairError.message === "POOR_QUALITY") {
          throw repairError;
        }
        logLlmError("repair generation failed", repairError);
        throw new Error("POOR_QUALITY");
      }
    }

    return plan;
  } catch (error) {
    logLlmError("generateTrip failed", error);
    throw error;
  }
}
