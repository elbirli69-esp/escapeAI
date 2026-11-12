import { describe, expect, it } from "vitest";
import {
  deriveCityQuizAnswer,
  deriveNearbyKeyword,
  normalizeGeoToken,
  resolveSiteAreaRadius,
} from "./geo-context.js";

describe("geo-context", () => {
  it("normaliza tokens de ciudad", () => {
    expect(normalizeGeoToken("Málaga")).toBe("malaga");
  });

  it("deriva respuestas deterministas", () => {
    const ctx = { city: "Madrid", neighborhood: "Lavapiés" };
    expect(deriveCityQuizAnswer(ctx)).toBe("madrid");
    expect(deriveNearbyKeyword(ctx, "seed-1")).toBe(deriveNearbyKeyword(ctx, "seed-1"));
  });

  it("usa radio amplio por defecto", () => {
    expect(resolveSiteAreaRadius({ city: "X" })).toBeGreaterThanOrEqual(5000);
  });
});
