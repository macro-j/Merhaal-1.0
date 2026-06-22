import { GoogleGenerativeAI } from "@google/generative-ai";

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

function getGenAI(): GoogleGenerativeAI {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("مفتاح Gemini API غير مُعرَّف. أضف VITE_GEMINI_API_KEY إلى ملف .env");
  }
  return new GoogleGenerativeAI(apiKey);
}

function buildPrompt(
  destination: string,
  days: number,
  budget: number,
  companions: string,
  interests: string
): string {
  return `You are an expert Saudi travel planner. Generate a highly logical ${days}-day itinerary for ${destination}. Budget: ${budget} SAR. Group: ${companions}. Interests: ${interests}.

Important: Ensure activities on the same day are geographically close to each other to avoid traffic.

Return STRICT JSON matching this exact structure (no extra keys, no markdown):
{
  "id": "will_be_generated",
  "title": "String",
  "destination": "String",
  "days": [
    {
      "dayNumber": 1,
      "activities": [
        {
          "time": "الصباح",
          "title": "String",
          "description": "String",
          "locationName": "String",
          "bookingSearchQuery": "String"
        }
      ]
    }
  ]
}

Rules:
- "time" must be exactly one of: "الصباح", "الظهر", "المساء"
- Include 2-4 activities per day
- bookingSearchQuery should be a clean search string for affiliate links (e.g. "فنادق الرياض", "بوليفارد الرياض")
- All generated text MUST be in Arabic
- Return ONLY valid JSON, no explanation`;
}

function stripMarkdownJson(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  return text.trim();
}

export async function generateTrip(
  destination: string,
  days: number,
  budget: number,
  companions: string,
  interests: string
): Promise<GeneratedTripPlan> {
  const model = getGenAI().getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const prompt = buildPrompt(destination, days, budget, companions, interests);
  const result = await model.generateContent(prompt);
  const rawText = result.response.text();

  if (!rawText) {
    throw new Error("لم يتم استلام رد من الذكاء الاصطناعي");
  }

  const parsed = JSON.parse(stripMarkdownJson(rawText)) as GeneratedTripPlan;

  if (!parsed.title || !parsed.destination || !Array.isArray(parsed.days)) {
    throw new Error("تنسيق الخطة غير صالح");
  }

  return parsed;
}
