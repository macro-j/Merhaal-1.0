import { describe, it, expect } from "vitest";
import {
  validateGeneratedItinerary,
  buildSystemPrompt,
  type GeneratedTripPlan,
  type GenerateTripParams,
  type ItineraryValidationContext,
} from "./llm";
import { resolveDestination } from "./destinationsData";

const riyadhContext: ItineraryValidationContext = {
  language: "ar",
  knowledge: resolveDestination("الرياض"),
  durationDays: 1,
};

function validRiyadhPlan(): GeneratedTripPlan {
  return {
    id: "will_be_generated",
    title: "يوم الدرعية التراثي في الرياض",
    destination: "الرياض",
    days: [
      {
        dayNumber: 1,
        activities: [
          {
            time: "الصباح",
            title: "جولة في حي الطريف",
            description:
              "ابدأ يومك في At-Turaif World Heritage Site, Diriyah للتجول بين الأزقة الطينية التاريخية قبل اشتداد الحر.",
            locationName: "At-Turaif World Heritage Site, Diriyah",
            bookingSearchQuery: "At-Turaif Diriyah tickets",
          },
          {
            time: "الظهر",
            title: "نزهة في وادي حنيفة",
            description:
              "استمتع بالمساحات الخضراء على ضفاف Wadi Hanifah, Riyadh القريبة من الدرعية مع استراحة هادئة وسط الطبيعة.",
            locationName: "Wadi Hanifah, Riyadh",
            bookingSearchQuery: "Wadi Hanifah Riyadh",
          },
          {
            time: "المساء",
            title: "عشاء في مطل البجيري",
            description:
              "اختتم اليوم بعشاء راقٍ في Bujairi Terrace, Diriyah بإطلالة مسائية ساحرة على حي الطريف ومطاعم عالمية.",
            locationName: "Bujairi Terrace, Diriyah",
            bookingSearchQuery: "Bujairi Terrace restaurants",
          },
        ],
      },
    ],
  };
}

describe("validateGeneratedItinerary", () => {
  it("accepts a grounded, geographically focused Riyadh plan", () => {
    const result = validateGeneratedItinerary(validRiyadhPlan(), riyadhContext);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects forbidden generic phrases", () => {
    const plan = validRiyadhPlan();
    plan.days[0].activities[1] = {
      time: "الظهر",
      title: "غداء في مطعم محلي",
      description:
        "تناول الغداء في مطعم محلي شهير بالقرب من الموقع للاستمتاع بأجواء بسيطة وممتعة طوال الوقت.",
      locationName: "مطعم محلي",
      bookingSearchQuery: "restaurant",
    };
    const result = validateGeneratedItinerary(plan, riyadhContext);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("مطعم محلي"))).toBe(true);
  });

  it("rejects empty locationName", () => {
    const plan = validRiyadhPlan();
    plan.days[0].activities[0].locationName = "";
    const result = validateGeneratedItinerary(plan, riyadhContext);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes("locationname"))).toBe(true);
  });

  it("detects repeated locations across the trip", () => {
    const plan = validRiyadhPlan();
    plan.days[0].activities[1].locationName = "At-Turaif World Heritage Site, Diriyah";
    const result = validateGeneratedItinerary(plan, riyadhContext);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes("repeated location"))).toBe(true);
  });

  it("rejects descriptions that are too short", () => {
    const plan = validRiyadhPlan();
    plan.days[0].activities[0].description = "قصير";
    const result = validateGeneratedItinerary(plan, riyadhContext);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes("too short"))).toBe(true);
  });

  it("flags low curated-knowledge coverage for known destinations", () => {
    const plan = validRiyadhPlan();
    for (const activity of plan.days[0].activities) {
      activity.locationName = "Riyadh Front, Riyadh";
      activity.description =
        "نشاط عام في موقع غير مدرج ضمن قاعدة المعرفة المنسقة لكنه واقعي وقابل للبحث في الخرائط.";
    }
    // After de-duping, locations repeat; coverage is also 0%.
    const result = validateGeneratedItinerary(plan, riyadhContext);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("curated places"))).toBe(true);
  });
});

describe("buildSystemPrompt", () => {
  const baseParams: GenerateTripParams = {
    destination: "الرياض",
    durationDays: 3,
    totalBudgetSar: 3000,
    accommodationType: "متوسط",
    mealsPerDay: 2,
    interests: ["ثقافة وتراث"],
    language: "ar",
  };

  it("embeds curated Riyadh knowledge and the interpreted budget tier", () => {
    const prompt = buildSystemPrompt(baseParams);
    expect(prompt).toContain("At-Turaif World Heritage Site, Diriyah");
    expect(prompt).toContain("interpreted budget tier: midRange");
    expect(prompt).toContain("estimated daily budget in SAR: 1000");
  });

  it("uses the strict fallback when the destination is unknown", () => {
    const prompt = buildSystemPrompt({ ...baseParams, destination: "London" });
    expect(prompt).toContain("NOT in the curated knowledge base");
  });
});
