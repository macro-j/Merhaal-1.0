import OpenAI from "openai";

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

const SYSTEM_PROMPT =
  "You are an expert Saudi travel planner. Return ONLY valid JSON matching this schema: { 'id': 'uuid', 'title': 'String', 'destination': 'String', 'days': [{ 'dayNumber': Number, 'activities': [{ 'time': 'الصباح' | 'الظهر' | 'المساء', 'title': 'String', 'description': 'String', 'locationName': 'String', 'bookingSearchQuery': 'String' }] }]}. All generated text MUST be in Arabic. Ensure activities on the same day are geographically close to avoid traffic. Include 2-4 activities per day. No markdown, no explanation.";

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

export function formatLlmError(error: unknown, language: "ar" | "en"): string {
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

function buildUserPrompt(
  destination: string,
  days: number,
  budget: number,
  companions: string,
  interests: string
): string {
  return `Generate a ${days}-day itinerary for ${destination}.
Budget: ${budget} SAR.
Group: ${companions}.
Interests: ${interests}.
Set "id" to "will_be_generated" and "destination" to "${destination}".`;
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
  try {
    const client = getGroqClient();

    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: buildUserPrompt(destination, days, budget, companions, interests),
        },
      ],
      temperature: 0.7,
    });

    const rawText = completion.choices[0]?.message?.content;

    if (!rawText) {
      throw new Error("لم يتم استلام رد من الذكاء الاصطناعي");
    }

    let parsed: GeneratedTripPlan;
    try {
      parsed = JSON.parse(stripMarkdownJson(rawText)) as GeneratedTripPlan;
    } catch (parseError) {
      logLlmError("JSON parse failed", parseError);
      console.error("[Groq] raw model response", rawText);
      throw new Error(
        parseError instanceof Error
          ? `JSON parse error: ${parseError.message}`
          : "JSON parse error"
      );
    }

    if (!parsed.title || !parsed.destination || !Array.isArray(parsed.days)) {
      throw new Error("تنسيق الخطة غير صالح");
    }

    return parsed;
  } catch (error) {
    logLlmError("generateTrip failed", error);
    throw error;
  }
}
