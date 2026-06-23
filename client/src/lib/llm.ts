import OpenAI from "openai";
import {
  findForbiddenPhrases,
  findKnowledgePlace,
  getBudgetTier,
  getDestinationKnowledgeForPrompt,
  normalizeInterests,
  normalizeText,
  resolveDestination,
  type DestinationKnowledge,
} from "@/lib/destinationsData";

export type TripActivityTime = "الصباح" | "الظهر" | "المساء";

export interface TripActivity {
  time: TripActivityTime;
  title: string;
  description: string;
  locationName: string;
  bookingSearchQuery: string;
}

export interface TripDay {
  dayNumber: number;
  activities: TripActivity[];
}

export interface GeneratedTripPlan {
  id: string;
  title: string;
  destination: string;
  days: TripDay[];
}

export type OutputLanguage = "ar" | "en";

export interface GenerateTripParams {
  destination: string;
  durationDays: number;
  totalBudgetSar: number;
  accommodationType: string;
  mealsPerDay: number;
  interests: string[];
  language: OutputLanguage;
  startDate?: string;
}

const MODEL = "llama-3.3-70b-versatile";
const MIN_DESCRIPTION_LENGTH = 40;
const MIN_LOCATION_LENGTH = 4;
const MIN_ACTIVITIES_PER_DAY = 3;
const KNOWLEDGE_COVERAGE_THRESHOLD = 0.6;
const VALID_TIMES: TripActivityTime[] = ["الصباح", "الظهر", "المساء"];
// CJK / Chinese characters that must never appear in generated Arabic/English text.
const CJK_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf]/;

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
  const dailyBudget = Math.round(
    params.totalBudgetSar / Math.max(1, params.durationDays)
  );
  const budgetTier = getBudgetTier(
    params.totalBudgetSar,
    params.durationDays,
    params.accommodationType,
    params.mealsPerDay
  );
  const interestTags = normalizeInterests(params.interests);
  const languageName = params.language === "ar" ? "Arabic" : "English";

  return `You are an elite Saudi travel concierge. Your mission is to craft realistic, premium, highly specific daily itineraries for Saudi destinations.

CRITICAL RULES:

1. REAL PLACES ONLY:
Never invent generic names such as: مطعم محلي، مطعم تقليدي، مطعم القرية، سوق شعبي، مقهى محلي، منطقة ترفيهية، مكان سياحي، معلم سياحي، local restaurant, traditional restaurant, popular café, local market, tourist attraction, famous place, hidden gem.
Use actual, searchable landmarks, restaurants, districts, and experiences.

2. USE THE DESTINATION KNOWLEDGE BASE:
Prioritize the curated places below. At least 60% of the main attractions must come from this list:
${knowledgeBlock}

3. MATCH THE USER INPUTS:
- destination: ${params.destination}
- start date: ${params.startDate || "not specified"}
- duration in days: ${params.durationDays}
- total trip budget in SAR: ${params.totalBudgetSar}
- estimated daily budget in SAR: ${dailyBudget}
- interpreted budget tier: ${budgetTier}
- accommodation type: ${params.accommodationType}
- meals per day: ${params.mealsPerDay}
- selected interests: ${describeInterests(params)}${
    interestTags.length ? ` (tags: ${interestTags.join(", ")})` : ""
  }
- output language: ${languageName}
The budget is a quality/feasibility signal, not a spending target. Do not try to spend the whole budget.

4. LOGICAL GEOGRAPHY:
Each day should focus on one area or nearby areas. Never create unrealistic routes that jump across far-apart areas without reason. Good day examples: Diriyah day (At-Turaif + Bujairi Terrace + Wadi Hanifah); Jeddah waterfront day (Jeddah Waterfront + Fakieh Aquarium + Jeddah Yacht Club); Taif mountain day (Al Hada + Al Shafa); Abha day (Al Soudah + High City + Art Street); AlUla heritage day (Hegra + Dadan + AlUla Old Town).

5. TIME-AWARE PLANNING (time field: "الصباح" morning, "الظهر" afternoon/noon, "المساء" evening):
- الصباح: heritage sites, outdoor walks, scenic viewpoints, light activities.
- الظهر: prefer indoor/shaded options, dining, malls, museums (especially in hot cities).
- المساء: premium dining, waterfronts, boulevards, viewpoints, entertainment zones.

6. INTEREST MATCHING:
culture & heritage -> heritage districts, museums, old towns, historic villages.
shopping & entertainment -> malls, boulevards, modern districts, yacht clubs, premium lifestyle.
family & kids -> safe accessible attractions, aquariums, parks, waterfronts.
food & restaurants -> specific named restaurants and dining districts (never generic).
adventure & sports -> mountains, trails, viewpoints, cable cars, outdoor experiences.

7. ACTIVITY COUNT (CRITICAL):
Every single day MUST contain a MINIMUM of 3 distinct time blocks/activities (e.g., Morning, Afternoon, Evening). Aim for 3-4 activities per day. Never return a day with fewer than 3 activities.

8. MEALS LOGIC (CRITICAL):
The mealsPerDay input (${params.mealsPerDay}) dictates ONLY how many dining activities to include. It DOES NOT reduce the total number of activities.
- If meals per day is 2: include exactly two dining moments (usually lunch + dinner), but the day must STILL have at least 3 total activities (e.g., 1 heritage/outdoor activity + 1 dining + 1 entertainment/dining).
- If meals per day is 3: include breakfast, lunch, and dinner, plus non-dining activities so the day stays rich (4+ activities is ideal).
Every meal must be a real, specific, named restaurant or dining district (never generic).

9. OUTPUT LANGUAGE & HALLUCINATION STRICTNESS (CRITICAL):
Output language: ${languageName}.
${
    params.language === "ar"
      ? `If Arabic: Use polished, 100% pure natural Arabic.`
      : `If English: Use clear, premium travel English.`
  }
STRICT NEGATIVE CONSTRAINT: You MUST NOT hallucinate, output, or mix in Chinese characters (e.g., "开始"), stray English words (unless it is a specific brand/location name like "VIA Riyadh" or "Bujairi Terrace"), or any other language in the title or description fields. The output MUST be strictly in the requested language.
For locationName, always use a precise, copy-paste-able Google Maps name. When writing in Arabic you may append the English map name, e.g. "مطل البجيري - Bujairi Terrace, Diriyah".

10. DESCRIPTION QUALITY (No generic filler):
Every activity description must explain exactly WHY the user is going there: why the place is worth visiting, why it fits the chosen interest, why it fits the time of day, and why it fits the budget level. Write naturally; do NOT start descriptions with poorly translated generic verbs or foreign words. ${
    params.language === "ar"
      ? `Good example: "استمتع بتجربة تسوق فاخرة في ڤيا رياض..." — Bad example: "开始 يومك...".`
      : `Good example: "Enjoy a refined dining experience at Myazu Riyadh..." — never inject non-English filler.`
  }

11. NO REPETITION:
Do not repeat the same attraction or restaurant across days unless the duration forces it.

12. JSON ONLY:
Return ONLY valid JSON. No markdown, no commentary outside the JSON.
Schema:
{
  "id": "will_be_generated",
  "title": "String",
  "destination": "String",
  "days": [
    {
      "dayNumber": 1,
      "activities": [
        { "time": "الصباح" | "الظهر" | "المساء", "title": "String", "description": "String", "locationName": "String", "bookingSearchQuery": "String" }
      ]
    }
  ]
}
Rules: "time" must be exactly one of "الصباح", "الظهر", "المساء". Include AT LEAST 3 activities per day (3-4 is ideal); never fewer than 3. bookingSearchQuery is a clean search string for booking/affiliate links.`;
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

      if (CJK_REGEX.test(activity.title || "") || CJK_REGEX.test(description)) {
        errors.push(
          `${where}: hallucinated foreign (Chinese) characters detected. Use ONLY the requested language.`
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
          areasInDay.add(place.area);
        }
      }
    });

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
