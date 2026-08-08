// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { buildDraftPlan } from "../planning/engine";
import { GroqTripCopywriter } from "./groqTripCopywriter";

const originalKey = process.env.GROQ_API_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = originalKey;
});

describe("GroqTripCopywriter", () => {
  it("requires the server-side GROQ_API_KEY", async () => {
    delete process.env.GROQ_API_KEY;
    const { plan } = buildDraftPlan({
      destination: "الرياض",
      durationDays: 1,
      budgetTier: "فاخرة",
      totalBudgetSAR: 8000,
      travelerCount: 1,
      interests: ["ترند ولايف ستايل"],
      language: "ar",
      startDate: "2026-10-01",
    });

    await expect(new GroqTripCopywriter().enrich(plan)).rejects.toMatchObject({
      code: "AI_UNAVAILABLE",
      status: 503,
    });
  });
});
