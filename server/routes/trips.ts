import { Router } from "express";
import { z } from "zod";
import type { TripCopywriter } from "../ai/groqTripCopywriter";
import { PlanningError } from "../planning/errors";
import { planTrip } from "../services/planTrip";

const requestSchema = z.object({
  destination: z.string().trim().min(2).max(80),
  durationDays: z.number().int().min(1).max(3),
  budgetTier: z.enum(["اقتصادية", "متوسطة", "فاخرة"]),
  totalBudgetSAR: z.number().positive().max(1_000_000).optional(),
  accommodationType: z.enum(["اقتصادية", "متوسطة", "فاخرة"]).optional(),
  travelerCount: z.number().int().min(1).max(12),
  interests: z.array(z.enum([
    "عريق وتراثي",
    "ترند ولايف ستايل",
    "استرخاء وطبيعة",
    "حيوية وترفيه",
  ])).min(1).max(4),
  language: z.enum(["ar", "en"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).superRefine((value, context) => {
  const supportedDestination = ["الرياض", "riyadh", "جدة", "jeddah"].includes(value.destination.toLowerCase());
  if (!supportedDestination) {
    context.addIssue({ code: "custom", path: ["destination"], message: "Destination is coming soon" });
  }
  const parsed = new Date(`${value.startDate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value.startDate) {
    context.addIssue({ code: "custom", path: ["startDate"], message: "Invalid calendar date" });
  }
});

export function createTripsRouter(copywriter: TripCopywriter): Router {
  const router = Router();

  router.post("/plan", async (request, response, next) => {
    try {
      const parsed = requestSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new PlanningError(
          "INVALID_INPUT",
          "مدخلات الرحلة غير صالحة.",
          parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
          400
        );
      }

      response.status(200).json(await planTrip(parsed.data, copywriter));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
