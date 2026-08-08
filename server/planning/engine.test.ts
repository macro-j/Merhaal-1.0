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

describe("Planning Engine v1.1", () => {
  it("builds a valid one-day heritage trip", () => {
    const { plan, context } = build();
    const result = validatePlan(plan, context);
    expect(result.valid, result.errors.join("\n")).toBe(true);
    expect(plan.days).toHaveLength(1);
    expect(plan.days[0].activities).toHaveLength(6);
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

  it("schedules meals and an optional coffee stop without a meal-count input", () => {
    const { plan } = build();
    expect(plan.days[0].activities.filter((activity) => activity.mealSlot).map((activity) => activity.mealSlot))
      .toEqual(["فطور", "غداء", "قهوة", "عشاء"]);
    expect(plan.days[0].activities.filter((activity) => activity.mealSlot !== "قهوة" && activity.mealSlot))
      .toHaveLength(3);
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

  it("selects the same ordered place IDs for the same planning inputs", () => {
    const first = build({ durationDays: 3, budgetTier: "فاخرة", totalBudgetSAR: 15000 }).plan;
    const second = build({ durationDays: 3, budgetTier: "فاخرة", totalBudgetSAR: 15000 }).plan;
    expect(first.days.flatMap((day) => day.activities.map((activity) => activity.placeId)))
      .toEqual(second.days.flatMap((day) => day.activities.map((activity) => activity.placeId)));
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

  it("varies meal density between arrival, full, and departure days", () => {
    const { plan, context } = build({ durationDays: 3, budgetTier: "فاخرة", totalBudgetSAR: 15000 });
    const result = validatePlan(plan, context);
    expect(result.valid, result.errors.join("\n")).toBe(true);
    expect(plan.days.map((day) => day.activities.filter(
      (activity) => activity.mealSlot && activity.mealSlot !== "قهوة"
    ).length)).toEqual([1, 2, 1]);
    expect(plan.days[1].activities.some((activity) => activity.mealSlot === "قهوة")).toBe(true);
  });

  it("builds valid two-day plans for solo, couple, and family-sized Riyadh trips", () => {
    for (const travelerCount of [1, 2, 4]) {
      const { plan, context } = build({
        durationDays: 2,
        budgetTier: "فاخرة",
        totalBudgetSAR: 5000 * travelerCount,
        travelerCount,
        interests: ["ترند ولايف ستايل", "عريق وتراثي"],
      });
      const result = validatePlan(plan, context);
      expect(result.valid, result.errors.join("\n")).toBe(true);
      expect(plan.preferences.travelerCount).toBe(travelerCount);
    }
  });

  it("rejects a one-day Jeddah plan instead of treating a verified cafe as a meal", () => {
    expectInsufficient({
      destination: "جدة",
      budgetTier: "فاخرة",
      totalBudgetSAR: 6000,
      interests: ["استرخاء وطبيعة"],
    });
  });

  it("reports the exact Jeddah food shortage for two and three days", () => {
    expectInsufficient({ destination: "جدة", durationDays: 2, budgetTier: "فاخرة", totalBudgetSAR: 12000 });
    expectInsufficient({ destination: "جدة", durationDays: 3, budgetTier: "فاخرة", totalBudgetSAR: 18000 });
  });

  it("keeps the reviewed Riyadh and Jeddah coverage matrix explicit", () => {
    const matrix = [
      { destination: "الرياض", budgetTier: "اقتصادية", expected: [false, false, false] },
      { destination: "الرياض", budgetTier: "متوسطة", expected: [true, true, true] },
      { destination: "الرياض", budgetTier: "فاخرة", expected: [true, true, true] },
      { destination: "جدة", budgetTier: "اقتصادية", expected: [false, false, false] },
      { destination: "جدة", budgetTier: "متوسطة", expected: [false, false, false] },
      { destination: "جدة", budgetTier: "فاخرة", expected: [false, false, false] },
    ] as const;

    for (const row of matrix) {
      row.expected.forEach((expected, index) => {
        const request = {
          destination: row.destination,
          budgetTier: row.budgetTier,
          durationDays: index + 1,
          totalBudgetSAR: row.budgetTier === "فاخرة" ? 18000 : row.budgetTier === "متوسطة" ? 5400 : 1500,
        } satisfies Partial<GenerateTripParams>;
        if (expected) {
          expect(() => build(request)).not.toThrow();
        } else {
          expectInsufficient(request);
        }
      });
    }
  });

  it("rejects trips longer than the current three-day product scope", () => {
    expect(() => build({ durationDays: 7 })).toThrowError(PlanningError);
  });

  it("rejects an economic plan when its meal constraints cannot be grounded", () => {
    try {
      build({ budgetTier: "اقتصادية", totalBudgetSAR: 600 });
      throw new Error("Expected planning to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(PlanningError);
      expect((error as PlanningError).details.some((detail) => detail.includes("توقفات طعام فريدة"))).toBe(true);
    }
  });

  it("rejects destinations marked as coming soon", () => {
    expect(() => build({ destination: "العلا", budgetTier: "فاخرة" })).toThrowError(PlanningError);
  });
});
