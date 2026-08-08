import OpenAI from "openai";
import type { GeneratedTripPlan, OutputLanguage } from "../../shared/tripTypes";
import { PlanningError } from "../planning/errors";

export interface TripCopywriter {
  enrich(plan: GeneratedTripPlan): Promise<GeneratedTripPlan>;
}

type ActivityCopy = {
  activityId: string;
  title: string;
  description: string;
  reason: string;
};

type DayCopy = {
  dayNumber: number;
  title: string;
  description: string;
  activities: ActivityCopy[];
};

type TripCopy = {
  tripTitle: string;
  days: DayCopy[];
};

const FOREIGN_SCRIPT_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf\u0400-\u04ff]/;

function getApiKey(): string {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) {
    throw new PlanningError(
      "AI_UNAVAILABLE",
      "مفتاح Groq غير مضبوط على الخادم.",
      ["أضف GROQ_API_KEY إلى متغيرات بيئة الخادم."],
      503
    );
  }
  return key;
}

function isText(value: unknown, minLength = 1): value is string {
  return typeof value === "string" && value.trim().length >= minLength && !FOREIGN_SCRIPT_REGEX.test(value);
}

function parseCopy(value: unknown, draft: GeneratedTripPlan): TripCopy {
  if (!value || typeof value !== "object") {
    throw new PlanningError("AI_INVALID_RESPONSE", "استجابة AI ليست كائن JSON صالحًا.", [], 502);
  }
  const copy = value as Partial<TripCopy>;
  if (!isText(copy.tripTitle, 4) || !Array.isArray(copy.days) || copy.days.length !== draft.days.length) {
    throw new PlanningError("AI_INVALID_RESPONSE", "استجابة AI لا تطابق عدد أيام الخطة.", [], 502);
  }

  for (const draftDay of draft.days) {
    const day = copy.days.find((candidate) => candidate?.dayNumber === draftDay.dayNumber);
    if (!day || !isText(day.title, 4) || !isText(day.description, 12) || !Array.isArray(day.activities)) {
      throw new PlanningError("AI_INVALID_RESPONSE", `صياغة اليوم ${draftDay.dayNumber} غير مكتملة.`, [], 502);
    }
    if (day.activities.length !== draftDay.activities.length) {
      throw new PlanningError("AI_INVALID_RESPONSE", `عدد أنشطة اليوم ${draftDay.dayNumber} تغير في استجابة AI.`, [], 502);
    }
    for (const draftActivity of draftDay.activities) {
      const activity = day.activities.find((candidate) => candidate?.activityId === draftActivity.id);
      if (
        !activity ||
        !isText(activity.title, 4) ||
        !isText(activity.description, 20) ||
        !isText(activity.reason, 12)
      ) {
        throw new PlanningError("AI_INVALID_RESPONSE", `صياغة النشاط ${draftActivity.id} غير مكتملة.`, [], 502);
      }
    }
  }
  return copy as TripCopy;
}

function buildPrompt(plan: GeneratedTripPlan, language: OutputLanguage): string {
  const languageName = language === "ar" ? "العربية الطبيعية الواضحة" : "natural, polished English";
  const payload = {
    destination: plan.destination,
    preferences: plan.preferences,
    days: plan.days.map((day) => ({
      dayNumber: day.dayNumber,
      date: day.date,
      activities: day.activities.map((activity) => ({
        activityId: activity.id,
        placeId: activity.placeId,
        placeName: activity.locationName,
        activityType: activity.activityType,
        mealSlot: activity.mealSlot,
        startTime: activity.startTime,
        endTime: activity.endTime,
        sourceDescription: activity.description,
      })),
    })),
  };

  return `أنت طبقة الصياغة في Merhaal. الجدول التالي نهائي وغير قابل للتعديل.
اكتب المحتوى فقط بلغة ${languageName} وبأسلوب يناسب اهتمامات المسافر.
ممنوع إضافة أو حذف نشاط، وممنوع تغيير activityId أو placeId أو المكان أو الوقت أو الترتيب.
لا تذكر معلومات تشغيل أو أسعار أو حقائق غير موجودة في sourceDescription.
أعد JSON فقط بهذا الشكل:
{"tripTitle":"...","days":[{"dayNumber":1,"title":"...","description":"...","activities":[{"activityId":"...","title":"...","description":"...","reason":"لماذا يناسب المستخدم"}]}]}

الخطة:
${JSON.stringify(payload)}`;
}

function mergeCopy(draft: GeneratedTripPlan, copy: TripCopy): GeneratedTripPlan {
  return {
    ...draft,
    title: copy.tripTitle.trim(),
    days: draft.days.map((draftDay) => {
      const dayCopy = copy.days.find((day) => day.dayNumber === draftDay.dayNumber)!;
      return {
        ...draftDay,
        title: dayCopy.title.trim(),
        description: dayCopy.description.trim(),
        activities: draftDay.activities.map((draftActivity) => {
          const activityCopy = dayCopy.activities.find(
            (activity) => activity.activityId === draftActivity.id
          )!;
          return {
            ...draftActivity,
            title: activityCopy.title.trim(),
            description: activityCopy.description.trim(),
            reason: activityCopy.reason.trim(),
          };
        }),
      };
    }),
  };
}

export class GroqTripCopywriter implements TripCopywriter {
  async enrich(plan: GeneratedTripPlan): Promise<GeneratedTripPlan> {
    const client = new OpenAI({
      apiKey: getApiKey(),
      baseURL: "https://api.groq.com/openai/v1",
    });
    try {
      const completion = await client.chat.completions.create({
        model: process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a constrained travel copywriter. Return valid JSON only and preserve every identifier.",
          },
          { role: "user", content: buildPrompt(plan, plan.preferences.language) },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      });
      const raw = completion.choices[0]?.message?.content;
      if (!raw) throw new Error("Empty response");
      const copy = parseCopy(JSON.parse(raw), plan);
      return mergeCopy(plan, copy);
    } catch (error) {
      if (error instanceof PlanningError) throw error;
      const message = error instanceof Error ? error.message : "Unknown Groq error";
      throw new PlanningError(
        "AI_UNAVAILABLE",
        "تعذر إكمال الصياغة عبر Groq.",
        [message],
        502
      );
    }
  }
}
