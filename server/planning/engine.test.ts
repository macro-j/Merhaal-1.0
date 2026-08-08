// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { GenerateTripParams } from "../../shared/tripTypes";
import { buildDraftPlan } from "./engine";
import { PlanningError } from "./errors";
import { validatePlan } from "./validator";

const baseParams: GenerateTripParams = {
  destination: "الرياض",
  durationDays: 1,
  budgetTier: "متوسطة",
  totalBudgetSAR: 3000,
  travelerCount: 1,
  interests: ["عريق وتراثي"],
  language: "ar",
  startDate: "2026-10-01",
};

function build(overrides: Partial<GenerateTripParams> = {}) {
  return buildDraftPlan({ ...baseParams, ...overrides });
}

function expectInsufficient(overrides: Partial<GenerateTripParams>) {
  try {
    build(overrides);
    throw new Error("Expected planning to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(PlanningError);
    expect((error as PlanningError).code).toBe("INSUFFICIENT_KNOWLEDGE");
    expect((error as PlanningError).details.length).toBeGreaterThan(0);
  }
}

describe("Planning Engine v1", () => {
  it("builds a valid one-day heritage trip", () => {
    const { plan, context } = build();
    const result = validatePlan(plan, context);
    expect(result.valid, result.errors.join("\n")).toBe(true);
    expect(plan.days).toHaveLength(1);
    expect(plan.days[0].activities).toHaveLength(4);
    expect(result.quality.breakdown.interestMatch).toBeGreaterThanOrEqual(50);
  });

  it("supports a one-day luxury lifestyle trip", () => {
    const { plan, context } = build({
      budgetTier: "فاخرة",
      totalBudgetSAR: 8000,
      interests: ["ترند ولايف ستايل"],
    });
    const result = validatePlan(plan, context);
    expect(result.valid, result.errors.join("\n")).toBe(true);
    expect(result.quality.breakdown.budgetMatch).toBe(100);
    expect(result.quality.score).toBeGreaterThanOrEqual(75);
  });

  it("schedules meals internally without a meal-count input", () => {
    const { plan } = build();
    expect(plan.days[0].activities.filter((activity) => activity.mealSlot).map((activity) => activity.mealSlot))
      .toEqual(["غداء", "عشاء"]);
  });

  it("uses traveler count when resolving the affordable budget tier", () => {
    const solo = build({ budgetTier: "فاخرة", totalBudgetSAR: 8000, travelerCount: 1 });
    const family = build({ budgetTier: "فاخرة", totalBudgetSAR: 8000, travelerCount: 4 });
    expect(solo.plan.preferences.resolvedBudgetTier).toBe("luxury");
    expect(family.plan.preferences.resolvedBudgetTier).toBe("midRange");
    expect(family.plan.preferences.dailyPerPersonBudgetSAR).toBe(2000);
  });

  it("never repeats a place and uses only knowledge-base IDs", () => {
    const { plan, context } = build({ budgetTier: "فاخرة" });
    const activities = plan.days.flatMap((day) => day.activities);
    const allowedIds = new Set(context.knowledge.places.map((place) => place.id));
    expect(new Set(activities.map((activity) => activity.placeId)).size).toBe(activities.length);
    expect(activities.every((activity) => allowedIds.has(activity.placeId))).toBe(true);
  });

  it("creates chronological, non-overlapping activity times", () => {
    const { plan } = build();
    for (const day of plan.days) {
      let previousEnd = "00:00";
      for (const activity of day.activities) {
        expect(activity.startTime < activity.endTime).toBe(true);
        expect(activity.startTime >= previousEnd).toBe(true);
        previousEnd = activity.endTime;
      }
    }
  });

  it("rejects a 3-day request when unique lunch places are insufficient", () => {
    expectInsufficient({ durationDays: 3, budgetTier: "فاخرة" });
  });

  it("rejects trips longer than the current three-day product scope", () => {
    expect(() => build({ durationDays: 7 })).toThrowError(PlanningError);
  });

  it("rejects an economic plan when its meal constraints cannot be grounded", () => {
    expectInsufficient({ budgetTier: "اقتصادية", totalBudgetSAR: 600 });
  });

  it("rejects destinations marked as coming soon", () => {
    expect(() => build({ destination: "العلا", budgetTier: "فاخرة" })).toThrowError(PlanningError);
  });
});
