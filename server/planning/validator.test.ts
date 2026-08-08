// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { GenerateTripParams } from "../../shared/tripTypes";
import { buildDraftPlan } from "./engine";
import { validateImmutableFields, validatePlan } from "./validator";

const params: GenerateTripParams = {
  destination: "الرياض",
  durationDays: 1,
  budgetTier: "فاخرة",
  totalBudgetSAR: 8000,
  travelerCount: 1,
  interests: ["ترند ولايف ستايل"],
  language: "ar",
  startDate: "2026-10-01",
};

function draft() {
  return buildDraftPlan(params);
}

describe("Quality Validator", () => {
  it("rejects duplicate places", () => {
    const { plan, context } = draft();
    plan.days[0].activities[1].placeId = plan.days[0].activities[0].placeId;
    const result = validatePlan(plan, context);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes("مكرر"))).toBe(true);
  });

  it("rejects an incorrect meal count", () => {
    const { plan, context } = draft();
    delete plan.days[0].activities[1].mealSlot;
    const result = validatePlan(plan, context);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes("وجبات"))).toBe(true);
  });

  it("rejects reversed times", () => {
    const { plan, context } = draft();
    plan.days[0].activities[0].endTime = "08:00";
    const result = validatePlan(plan, context);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes("ينتهي قبل"))).toBe(true);
  });

  it("rejects overlapping activities", () => {
    const { plan, context } = draft();
    plan.days[0].activities[1].startTime = "10:30";
    const result = validatePlan(plan, context);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes("متداخل"))).toBe(true);
  });

  it("rejects a place outside the allowed knowledge base", () => {
    const { plan, context } = draft();
    plan.days[0].activities[0].placeId = "unknown-place";
    const result = validatePlan(plan, context);
    expect(result.valid).toBe(false);
    expect(result.quality.breakdown.knowledgeBaseCoverage).toBeLessThan(100);
  });

  it("detects any AI-layer change to deterministic fields", () => {
    const { plan } = draft();
    const enriched = structuredClone(plan);
    enriched.title = "عنوان محسّن";
    enriched.days[0].title = "يوم مخصص";
    enriched.days[0].activities[0].description = "وصف عربي محسّن ومفصل للنشاط المختار.";
    expect(validateImmutableFields(plan, enriched)).toEqual([]);

    enriched.days[0].activities[0].startTime = "10:00";
    expect(validateImmutableFields(plan, enriched)).not.toEqual([]);
  });
});
