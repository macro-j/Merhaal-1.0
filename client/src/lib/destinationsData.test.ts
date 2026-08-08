import { describe, it, expect } from "vitest";
import {
  DESTINATIONS_KNOWLEDGE,
  findForbiddenPhrases,
  resolveBudgetTier,
  getDestinationKnowledgeForPrompt,
  normalizeInterests,
  resolveDestination,
} from "./destinationsData";

describe("resolveDestination", () => {
  it("resolves Riyadh from English and Arabic aliases", () => {
    expect(resolveDestination("Riyadh")?.canonicalName).toBe("Riyadh");
    expect(resolveDestination("الرياض")?.canonicalName).toBe("Riyadh");
    expect(resolveDestination("Ar Riyadh")?.canonicalName).toBe("Riyadh");
  });

  it("resolves Jeddah, Taif, Abha (incl. Aseer), and AlUla aliases", () => {
    expect(resolveDestination("Jedda")?.canonicalName).toBe("Jeddah");
    expect(resolveDestination("جدة")?.canonicalName).toBe("Jeddah");
    expect(resolveDestination("Al Taif")?.canonicalName).toBe("Taif");
    expect(resolveDestination("الطائف")?.canonicalName).toBe("Taif");
    expect(resolveDestination("Aseer")?.canonicalName).toBe("Abha");
    expect(resolveDestination("عسير")?.canonicalName).toBe("Abha");
    expect(resolveDestination("أبها")?.canonicalName).toBe("Abha");
    expect(resolveDestination("Al Ula")?.canonicalName).toBe("AlUla");
    expect(resolveDestination("العلا")?.canonicalName).toBe("AlUla");
  });

  it("returns null for unknown destinations", () => {
    expect(resolveDestination("Paris")).toBeNull();
    expect(resolveDestination("")).toBeNull();
  });
});

describe("resolveBudgetTier", () => {
  it("maps the Arabic tiers to internal tiers", () => {
    expect(resolveBudgetTier("اقتصادية")).toBe("budget");
    expect(resolveBudgetTier("متوسطة")).toBe("midRange");
    expect(resolveBudgetTier("فاخرة")).toBe("luxury");
  });

  it("handles English/VIP synonyms and unknown values", () => {
    expect(resolveBudgetTier("Luxury VIP")).toBe("luxury");
    expect(resolveBudgetTier("budget")).toBe("budget");
    expect(resolveBudgetTier("something else")).toBe("midRange");
  });
});

describe("getDestinationKnowledgeForPrompt", () => {
  it("injects Riyadh knowledge when Riyadh is selected", () => {
    const prompt = getDestinationKnowledgeForPrompt("الرياض");
    expect(prompt).toContain("At-Turaif World Heritage Site, Diriyah");
    expect(prompt).toContain("Bujairi Terrace, Diriyah");
  });

  it("injects AlUla knowledge when AlUla is selected", () => {
    const prompt = getDestinationKnowledgeForPrompt("AlUla");
    expect(prompt).toContain("Hegra, AlUla");
    expect(prompt).toContain("Maraya, AlUla");
  });

  it("falls back to a strict no-invention instruction for unknown destinations", () => {
    const prompt = getDestinationKnowledgeForPrompt("Tokyo");
    expect(prompt).toContain("NOT in the curated knowledge base");
    expect(prompt.toLowerCase()).toContain("do not invent");
  });
});

describe("normalizeInterests", () => {
  it("maps the new mood vocabulary to canonical tags", () => {
    expect(normalizeInterests(["عريق وتراثي"])).toEqual(
      expect.arrayContaining(["culture", "heritage"])
    );
    expect(normalizeInterests(["ترند ولايف ستايل"])).toEqual(
      expect.arrayContaining(["food", "restaurants", "shopping", "entertainment"])
    );
    expect(normalizeInterests(["استرخاء وطبيعة"])).toEqual(
      expect.arrayContaining(["nature", "relaxation"])
    );
    expect(normalizeInterests(["حيوية وترفيه"])).toEqual(
      expect.arrayContaining(["entertainment", "family", "adventure"])
    );
  });
});

describe("findForbiddenPhrases", () => {
  it("detects generic Arabic and English phrases", () => {
    expect(findForbiddenPhrases("زيارة مطعم محلي شهير")).toContain("مطعم محلي");
    expect(findForbiddenPhrases("visit a local market")).toContain("local market");
  });

  it("does not flag specific named places", () => {
    expect(findForbiddenPhrases("Bujairi Terrace, Diriyah")).toHaveLength(0);
  });
});

describe("knowledge base integrity", () => {
  it("covers all five supported destinations", () => {
    expect(DESTINATIONS_KNOWLEDGE.map((d) => d.canonicalName).sort()).toEqual(
      ["Abha", "AlUla", "Jeddah", "Riyadh", "Taif"].sort()
    );
  });

  it("gives every place a copy-pasteable mapSearchQuery", () => {
    for (const dest of DESTINATIONS_KNOWLEDGE) {
      for (const place of dest.places) {
        expect(place.mapSearchQuery.trim().length).toBeGreaterThan(3);
      }
    }
  });

  it("gives every place real coordinates within Saudi Arabia bounds", () => {
    for (const dest of DESTINATIONS_KNOWLEDGE) {
      for (const place of dest.places) {
        expect(place.coordinates, `${place.id} missing coordinates`).toBeDefined();
        expect(place.coordinates!.lat).toBeGreaterThan(16);
        expect(place.coordinates!.lat).toBeLessThan(33);
        expect(place.coordinates!.lng).toBeGreaterThan(34);
        expect(place.coordinates!.lng).toBeLessThan(56);
      }
    }
  });

  it("keeps Riyadh and Jeddah identifiers and classification arrays duplicate-free", () => {
    const reviewed = DESTINATIONS_KNOWLEDGE.filter((destination) =>
      ["Riyadh", "Jeddah"].includes(destination.canonicalName)
    );
    const ids = reviewed.flatMap((destination) => destination.places.map((place) => place.id));
    expect(new Set(ids).size).toBe(ids.length);

    for (const destination of reviewed) {
      for (const place of destination.places) {
        for (const values of [
          place.recommendedTime,
          place.budgetLevel,
          place.bestFor,
          place.interests,
          place.mealSlot,
        ]) {
          expect(new Set(values).size, `${place.id} contains duplicate values`).toBe(values.length);
        }
        expect(place.planningNotes.trim().length, `${place.id} missing planning notes`).toBeGreaterThan(10);
        expect(place.priorityScore).toBeGreaterThanOrEqual(1);
        expect(place.priorityScore).toBeLessThanOrEqual(100);
        for (const score of [
          place.localAuthenticityScore,
          place.familyFriendlyScore,
          place.luxuryScore,
          place.trendScore,
        ]) {
          expect(score).toBeGreaterThanOrEqual(1);
          expect(score).toBeLessThanOrEqual(10);
        }
      }
    }
  });

  it("uses the food roles explicitly supported by the current Riyadh and Jeddah notes", () => {
    const riyadh = resolveDestination("الرياض")!;
    const jeddah = resolveDestination("جدة")!;
    expect(riyadh.places.find((place) => place.id === "riyadh-aok-kitchen")?.mealSlot)
      .toEqual(["فطور", "غداء"]);
    expect(riyadh.places.find((place) => place.id === "riyadh-aok-kitchen")?.recommendedTime)
      .toEqual(["morning", "afternoon"]);
    expect(jeddah.places.find((place) => place.id === "jeddah-angelina")).toMatchObject({
      category: "cafe",
      mealSlot: ["قهوة"],
    });
  });
});
