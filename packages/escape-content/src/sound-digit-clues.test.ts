import { describe, expect, it } from "vitest";
import {
  beepPatternForTwoDigits,
  buildProceduralSoundIntro,
  hash32,
} from "./sound-digit-clues.js";

describe("sound-digit-clues", () => {
  it("es determinista por eventId", () => {
    const a = buildProceduralSoundIntro({
      eventId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      twoDigitAnswer: "19",
      nickname: "Ada",
      factSnippet: "Nació en 1815",
    });
    const b = buildProceduralSoundIntro({
      eventId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      twoDigitAnswer: "19",
      nickname: "Ada",
      factSnippet: "Nació en 1815",
    });
    expect(a).toEqual(b);
  });

  it("tts incluye palabras de dígitos", () => {
    const intro = buildProceduralSoundIntro({
      eventId: "00000000-0000-4000-8000-000000000001",
      twoDigitAnswer: "19",
      nickname: "Ada",
      factSnippet: "fact",
    });
    if (intro.soundMode === "tts") {
      expect(intro.ttsText).toMatch(/uno|1/i);
      expect(intro.ttsText).toMatch(/nueve|9/i);
    }
  });

  it("beepPattern escala con valor de cifra", () => {
    const one = beepPatternForTwoDigits("11").filter((_, i) => i % 2 === 0).length;
    const nine = beepPatternForTwoDigits("99").filter((_, i) => i % 2 === 0).length;
    expect(nine).toBeGreaterThan(one);
  });

  it("hash32 estable", () => {
    expect(hash32("x")).toBe(hash32("x"));
    expect(hash32("a")).not.toBe(hash32("b"));
  });
});
