// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { TripCopywriter } from "../ai/groqTripCopywriter";
import type { GenerateTripParams } from "../../shared/tripTypes";
import { PlanningError } from "../planning/errors";
import { planTrip } from "./planTrip";

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

describe("trip planning pipeline", () => {
  it("accepts AI copy changes and returns a scored structured plan", async () => {
    const copywriter: TripCopywriter = {
      async enrich(draft) {
        const enriched = structuredClone(draft);
        enriched.title = "رحلة عصرية في الرياض";
        enriched.days[0].title = "يوم الرياض المتجدد";
        enriched.days[0].description = "يوم يجمع بين التجارب المختارة بإيقاع متوازن.";
        for (const activity of enriched.days[0].activities) {
          activity.title = `تجربة ${activity.title}`;
          activity.description = `${activity.description} ضمن برنامج يناسب تفضيلات الرحلة.`;
          activity.reason = "يناسب اهتمامات المسافر ويحافظ على توازن اليوم.";
        }
        return enriched;
      },
    };

    const plan = await planTrip(params, copywriter);
    expect(plan.title).toBe("رحلة عصرية في الرياض");
    expect(plan.metadata.engineVersion).toBe("1.0");
    expect(plan.quality.score).toBeGreaterThanOrEqual(75);
  });

  it("rejects an AI attempt to change a deterministic time", async () => {
    const copywriter: TripCopywriter = {
      async enrich(draft) {
        draft.days[0].activities[0].startTime = "10:00";
        return draft;
      },
    };

    await expect(planTrip(params, copywriter)).rejects.toMatchObject<Partial<PlanningError>>({
      code: "PLAN_VALIDATION_FAILED",
    });
  });
});
