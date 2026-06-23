import OpenAI from "openai";
import {
  findForbiddenPhrases,
  findKnowledgePlace,
  getDestinationKnowledgeForPrompt,
  normalizeInterests,
  normalizeText,
  resolveBudgetTier,
  resolveDestination,
  type DestinationKnowledge,
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
  interests: TripMood[];
  language: OutputLanguage;
  startDate?: string;
}

const MODEL = "llama-3.3-70b-versatile";
const MIN_DESCRIPTION_LENGTH = 40;
const MIN_LOCATION_LENGTH = 4;
const MIN_ACTIVITIES_PER_DAY = 4;
const MAX_GAP_MINUTES = 180;
const KNOWLEDGE_COVERAGE_THRESHOLD = 0.6;
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

function stripMarkdownJson(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  return text.trim();
}

function describeInterests(params: GenerateTripParams): string {
  if (!params.interests.length) {
    return params.language === "ar" ? "عام (بدون تفضيل محدد)" : "general (no specific preference)";
  }
  return params.interests.join(params.language === "ar" ? "، " : ", ");
}

export function buildSystemPrompt(params: GenerateTripParams): string {
  const knowledgeBlock = getDestinationKnowledgeForPrompt(params.destination);
  const budgetTier = resolveBudgetTier(params.budgetTier);
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
- Destination: ${params.destination}
- Duration: ${params.durationDays} day(s)
- Start date: ${params.startDate || "not specified"}
- Budget & Style: ${params.budgetTier} (internal tier: ${budgetTier})
- Vibe & Moods: ${moodList}${interestTags.length ? ` (tags: ${interestTags.join(", ")})` : ""}
</user_profile>

<curated_places>
CRITICAL: These are the only real, hand-picked places you may use. SELECT from this list — never invent generic places. At least 60% of activities MUST come from this list, and each day should stay geographically focused on one area or nearby areas.
${knowledgeBlock}
</curated_places>

<strict_time_and_logic_laws>
CRITICAL: You must obey the physics of time and the reality of Saudi tourism.
1. MORNINGS (08:00 - 12:00) -> time = "الصباح": ONLY Heritage sites (e.g., At-Turaif, museums), Nature (Wadi Hanifah, parks, viewpoints), or Breakfast/Brunch cafes. NEVER schedule entertainment zones or malls here.
2. AFTERNOONS (12:00 - 17:00) -> time = "الظهر": indoor/shaded activities, premium lunches, museums, or relaxed walks.
3. EVENINGS/NIGHTS (17:00 - 23:59) -> time = "المساء": THIS is when you schedule "Trendy & Lifestyle" or "Vibrant & Entertainment" places (e.g., Boulevard World, VIA Riyadh, KAFD, fine dining, waterfronts, boulevards).
4. NO DEAD TIME: the gap between the END of one activity and the START of the next MUST NOT exceed 3 hours (180 min). Keep only realistic transitions (~20-45 min). If one ends at 11:30, the next must start by 14:30 at the latest.
5. DENSITY: provide EXACTLY 4 to 5 activities per day — never fewer than 4.
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
Weave 1-2 real meal moments (lunch + dinner) plus a trendy coffee stop into each day, all chosen from the curated dining/cafe list. Never use generic restaurant names. Dining and coffee count toward the 4-5 daily activities.
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
}

export interface ItineraryValidationResult {
  valid: boolean;
  errors: string[];
}

const ARABIC_REGEX = /[\u0600-\u06FF]/;

function hasArabic(text: string): boolean {
  return ARABIC_REGEX.test(text);
}

/**
 * Parse an "HH:MM" 24-hour string into minutes-since-midnight, or null if invalid.
 */
function parseTimeToMinutes(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
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

  const seenLocations = new Map<string, number>();
  let totalActivities = 0;
  let knowledgeMatches = 0;

  plan.days.forEach((day, dayIdx) => {
    const dayLabel = `Day ${day?.dayNumber ?? dayIdx + 1}`;
    if (!day || !Array.isArray(day.activities) || day.activities.length === 0) {
      errors.push(`${dayLabel}: has no activities.`);
      return;
    }

    if (day.activities.length < MIN_ACTIVITIES_PER_DAY) {
      errors.push(
        `${dayLabel}: generated only ${day.activities.length} activities. You must generate at least ${MIN_ACTIVITIES_PER_DAY} distinct activities per day.`
      );
    }

    const areasInDay = new Set<string>();
    const timeSlots: Array<{ start: number; end: number; label: string }> = [];

    day.activities.forEach((activity, actIdx) => {
      totalActivities += 1;
      const where = `${dayLabel} activity ${actIdx + 1}`;

      if (!activity || typeof activity !== "object") {
        errors.push(`${where}: is not a valid object.`);
        return;
      }

      if (!VALID_TIMES.includes(activity.time)) {
        errors.push(`${where}: invalid 'time' value "${String(activity.time)}".`);
      }

      const startMinutes = parseTimeToMinutes(activity.startTime);
      const endMinutes = parseTimeToMinutes(activity.endTime);
      if (startMinutes === null) {
        errors.push(`${where}: missing or invalid 'startTime' (expected "HH:MM").`);
      }
      if (endMinutes === null) {
        errors.push(`${where}: missing or invalid 'endTime' (expected "HH:MM").`);
      }
      if (startMinutes !== null && endMinutes !== null) {
        if (endMinutes <= startMinutes) {
          errors.push(`${where}: 'endTime' must be after 'startTime'.`);
        }
        timeSlots.push({ start: startMinutes, end: endMinutes, label: where });
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

      const description = (activity.description || "").trim();
      if (description.length < MIN_DESCRIPTION_LENGTH) {
        errors.push(`${where}: 'description' is too short (min ${MIN_DESCRIPTION_LENGTH} chars).`);
      }

      const combined = `${activity.title || ""} ${location} ${description}`;
      const forbidden = findForbiddenPhrases(combined);
      if (forbidden.length) {
        errors.push(`${where}: forbidden generic phrase(s): ${forbidden.join(", ")}.`);
      }

      if (FOREIGN_SCRIPT_REGEX.test(activity.title || "") || FOREIGN_SCRIPT_REGEX.test(description)) {
        errors.push(
          `${where}: hallucinated foreign (Chinese/Cyrillic) characters detected. Use ONLY the requested language.`
        );
      }

      if (context.language === "ar" && description && !hasArabic(description)) {
        errors.push(`${where}: description must be in Arabic.`);
      }
      if (context.language === "en" && description) {
        const arabicChars = (description.match(/[\u0600-\u06FF]/g) || []).length;
        if (arabicChars > description.length * 0.5) {
          errors.push(`${where}: description must be in English.`);
        }
      }

      if (location) {
        const key = normalizeText(location);
        seenLocations.set(key, (seenLocations.get(key) || 0) + 1);

        const place = context.knowledge
          ? findKnowledgePlace(location, context.knowledge)
          : null;
        if (place) {
          knowledgeMatches += 1;
          // Only anchor attractions constrain a day's geography; cafes and dining
          // can sit anywhere in the city (e.g. a late-night trendy cafe).
          if (place.category !== "cafe" && place.category !== "dining") {
            areasInDay.add(place.area);
          }
        }
      }
    });

    // No dead time: gaps between consecutive activities must not exceed 3 hours.
    const ordered = [...timeSlots].sort((a, b) => a.start - b.start);
    for (let i = 1; i < ordered.length; i += 1) {
      const gap = ordered[i].start - ordered[i - 1].end;
      if (gap > MAX_GAP_MINUTES) {
        errors.push(
          `${dayLabel}: dead time of ${Math.round(
            gap / 60
          )}h between activities (max allowed 3h). Fill the gap with a meal, coffee, or nearby stop.`
        );
      }
    }

    // Geographic sanity: when we could map known places to >=2 distinct areas in a
    // single day, flag it as a likely unrealistic route.
    if (areasInDay.size > 2) {
      errors.push(
        `${dayLabel}: spans ${areasInDay.size} distinct areas (${Array.from(areasInDay).join(
          ", "
        )}); keep each day geographically focused.`
      );
    }
  });

  // Repeated locations across the whole trip (allow when duration forces reuse).
  const knownPlaceCount = context.knowledge?.places.length ?? 0;
  const repeatsAllowed = knownPlaceCount > 0 && totalActivities > knownPlaceCount;
  if (!repeatsAllowed) {
    for (const [key, count] of seenLocations) {
      if (count > 1) {
        errors.push(`Repeated location across the trip: "${key}" appears ${count} times.`);
      }
    }
  }

  // Curated-knowledge coverage for known destinations.
  if (context.knowledge && totalActivities > 0) {
    const coverage = knowledgeMatches / totalActivities;
    if (coverage < KNOWLEDGE_COVERAGE_THRESHOLD) {
      errors.push(
        `Only ${Math.round(coverage * 100)}% of activities use curated places; at least ${Math.round(
          KNOWLEDGE_COVERAGE_THRESHOLD * 100
        )}% required.`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

async function requestItinerary(
  client: OpenAI,
  systemPrompt: string,
  userPrompt: string
): Promise<GeneratedTripPlan> {
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

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
  validationErrors: string[]
): Promise<GeneratedTripPlan> {
  const systemPrompt = buildSystemPrompt(params);
  const repairPrompt = `Your previous itinerary was REJECTED for these reasons:
${validationErrors.map((e) => `- ${e}`).join("\n")}

Regenerate the FULL itinerary for ${params.destination} fixing every issue above.
Use ONLY real, specific, searchable places (prioritize the curated knowledge base).
Keep each day geographically focused, avoid generic phrases, avoid repeating locations,
and write every description with concrete, premium detail. Return JSON only.`;

  return requestItinerary(client, systemPrompt, repairPrompt);
}

export async function generateTrip(params: GenerateTripParams): Promise<GeneratedTripPlan> {
  try {
    const client = getGroqClient();
    const knowledge = resolveDestination(params.destination);
    const context: ItineraryValidationContext = {
      language: params.language,
      knowledge,
      durationDays: params.durationDays,
    };

    const systemPrompt = buildSystemPrompt(params);
    const userPrompt = buildUserPrompt(params);

    let plan = await requestItinerary(client, systemPrompt, userPrompt);
    let result = validateGeneratedItinerary(plan, context);

    if (!result.valid) {
      console.warn("[Groq] itinerary validation failed, attempting repair", result.errors);
      try {
        const repaired = await repairGeneratedItineraryIfNeeded(client, params, result.errors);
        const repairedResult = validateGeneratedItinerary(repaired, context);
        if (repairedResult.valid) {
          plan = repaired;
          result = repairedResult;
        } else {
          console.error("[Groq] repair still invalid", repairedResult.errors);
          throw new Error("POOR_QUALITY");
        }
      } catch (repairError) {
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
