import { describe, it, expect } from "vitest";
import {
  DESTINATIONS_KNOWLEDGE,
  findForbiddenPhrases,
  getBudgetTier,
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

describe("getBudgetTier", () => {
  it("treats a high daily budget as luxury", () => {
    expect(getBudgetTier(5800, 1, "متوسط", 2)).toBe("luxury");
  });

  it("treats the same total over a long trip as mid-range or budget by accommodation", () => {
    expect(getBudgetTier(5800, 7, "اقتصادي", 2)).toBe("midRange");
    expect(getBudgetTier(5800, 7, "متوسط", 3)).toBe("budget");
  });

  it("interprets the success-criteria 3-day Riyadh trip as mid-range", () => {
    expect(getBudgetTier(3000, 3, "متوسط", 2)).toBe("midRange");
  });

  it("never divides by zero on a zero-day input", () => {
    expect(() => getBudgetTier(1000, 0, "luxury", 2)).not.toThrow();
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
  it("maps Arabic UI labels to canonical tags", () => {
    expect(normalizeInterests(["ثقافة وتراث"])).toEqual(
      expect.arrayContaining(["culture", "heritage"])
    );
    expect(normalizeInterests(["طعام ومطاعم"])).toEqual(
      expect.arrayContaining(["food", "restaurants"])
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
});
