import type { GenerateTripParams, GeneratedTripPlan } from "../../shared/tripTypes";
import type { TripCopywriter } from "../ai/groqTripCopywriter";
import { buildDraftPlan } from "../planning/engine";
import { PlanningError } from "../planning/errors";
import { validateImmutableFields, validatePlan } from "../planning/validator";

export async function planTrip(
  params: GenerateTripParams,
  copywriter: TripCopywriter
): Promise<GeneratedTripPlan> {
  const { plan: draft, context } = buildDraftPlan(params);
  const draftValidation = validatePlan(draft, context);
  if (!draftValidation.valid) {
    throw new PlanningError(
      "PLAN_VALIDATION_FAILED",
      "فشلت مسودة Planning Engine في التحقق.",
      draftValidation.errors
    );
  }
  draft.quality = draftValidation.quality;

  const lockedDraft = structuredClone(draft);
  const enriched = await copywriter.enrich(structuredClone(draft));
  const immutableErrors = validateImmutableFields(lockedDraft, enriched);
  if (immutableErrors.length > 0) {
    throw new PlanningError(
      "PLAN_VALIDATION_FAILED",
      "رفض النظام تغييرات غير مسموحة من طبقة AI.",
      immutableErrors
    );
  }

  const finalValidation = validatePlan(enriched, context);
  if (!finalValidation.valid) {
    throw new PlanningError(
      "PLAN_VALIDATION_FAILED",
      "الخطة النهائية لم تحقق معايير الجودة.",
      finalValidation.errors
    );
  }
  enriched.quality = finalValidation.quality;
  return enriched;
}
