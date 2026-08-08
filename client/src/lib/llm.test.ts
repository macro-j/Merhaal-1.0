import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatLlmError,
  generateTrip,
  TripPlanningApiError,
  type GenerateTripParams,
  type GeneratedTripPlan,
} from "./llm";

const params: GenerateTripParams = {
  destination: "الرياض",
  durationDays: 1,
  budgetTier: "متوسطة",
  totalBudgetSAR: 3000,
  travelerCount: 1,
  interests: ["عريق وتراثي"],
  language: "ar",
  startDate: "2026-10-01",
};

afterEach(() => vi.restoreAllMocks());

describe("generateTrip API client", () => {
  it("posts the trip inputs to the server endpoint", async () => {
    const plan = { id: "trip-1", days: [] } as unknown as GeneratedTripPlan;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(plan), { status: 200, headers: { "Content-Type": "application/json" } })
    );

    await expect(generateTrip(params)).resolves.toEqual(plan);
    expect(fetchMock).toHaveBeenCalledWith("/api/trips/plan", expect.objectContaining({
      method: "POST",
      body: JSON.stringify(params),
    }));
  });

  it("preserves structured server errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        error: {
          code: "INSUFFICIENT_KNOWLEDGE",
          message: "قاعدة المعرفة غير كافية.",
          details: ["المتاح أقل من المطلوب."],
        },
      }), { status: 422, headers: { "Content-Type": "application/json" } })
    );

    await expect(generateTrip(params)).rejects.toMatchObject({
      code: "INSUFFICIENT_KNOWLEDGE",
      details: ["المتاح أقل من المطلوب."],
    });
  });
});

describe("formatLlmError", () => {
  it("shows the server message and first limitation in Arabic", () => {
    const error = new TripPlanningApiError(
      "INSUFFICIENT_KNOWLEDGE",
      "لا تكفي البيانات لبناء الرحلة.",
      ["لا توجد مطاعم كافية."]
    );
    expect(formatLlmError(error, "ar")).toContain("لا توجد مطاعم كافية");
  });
});
