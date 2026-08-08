import type {
  GenerateTripParams,
  GeneratedTripPlan,
  OutputLanguage,
  PlanningErrorCode,
  PlanningErrorPayload,
} from "@shared/tripTypes";

export * from "@shared/tripTypes";

export class TripPlanningApiError extends Error {
  constructor(
    public readonly code: PlanningErrorCode,
    message: string,
    public readonly details: string[] = []
  ) {
    super(message);
    this.name = "TripPlanningApiError";
  }
}

export async function generateTrip(params: GenerateTripParams): Promise<GeneratedTripPlan> {
  let response: Response;
  try {
    response = await fetch("/api/trips/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  } catch {
    throw new TripPlanningApiError("AI_UNAVAILABLE", "تعذر الاتصال بخادم Merhaal.");
  }

  const payload = await response.json().catch(() => null) as GeneratedTripPlan | PlanningErrorPayload | null;
  if (!response.ok) {
    const errorPayload = payload && "error" in payload ? payload.error : null;
    throw new TripPlanningApiError(
      errorPayload?.code ?? "INTERNAL_ERROR",
      errorPayload?.message ?? "تعذر إنشاء الخطة.",
      errorPayload?.details ?? []
    );
  }
  if (!payload || "error" in payload || !Array.isArray(payload.days)) {
    throw new TripPlanningApiError("INTERNAL_ERROR", "استجابة الخادم غير صالحة.");
  }
  return payload;
}

export function formatLlmError(error: unknown, language: OutputLanguage): string {
  if (error instanceof TripPlanningApiError) {
    const detail = error.details[0] ? ` (${error.details[0]})` : "";
    if (language === "ar") return `${error.message}${detail}`;
    const english: Record<PlanningErrorCode, string> = {
      INVALID_INPUT: "Some trip inputs are invalid.",
      UNSUPPORTED_DESTINATION: "This destination is not supported yet.",
      INSUFFICIENT_KNOWLEDGE: "The current place knowledge is insufficient for these constraints.",
      PLAN_VALIDATION_FAILED: "The itinerary did not pass Merhaal's quality checks.",
      AI_UNAVAILABLE: "The AI writing service is currently unavailable.",
      AI_INVALID_RESPONSE: "The AI writing response was invalid.",
      INTERNAL_ERROR: "An unexpected error occurred while planning the trip.",
    };
    return `${english[error.code]}${detail}`;
  }
  const message = error instanceof Error ? error.message : String(error);
  return language === "ar" ? `تعذر توليد الخطة: ${message}` : `Could not generate the trip: ${message}`;
}
