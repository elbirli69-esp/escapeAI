import { describe, expect, it } from "vitest";
import { matchPlayerAnswer, spanishSpokenToDigits } from "./answer-match.js";

describe("matchPlayerAnswer", () => {
  it("rechaza vacíos", () => {
    expect(matchPlayerAnswer("", "luego", { voiceMatchMode: "fuzzy" })).toBe(false);
    expect(matchPlayerAnswer("   ", "3", { normalize: "trim" })).toBe(false);
  });

  it("no aplica fuzzy a códigos numéricos", () => {
    expect(matchPlayerAnswer("4", "3", { normalize: "trim", voiceMatchMode: "fuzzy" })).toBe(false);
    expect(matchPlayerAnswer("12", "13", { normalize: "trim", voiceMatchMode: "fuzzy" })).toBe(false);
    expect(matchPlayerAnswer("3", "3", { normalize: "trim", voiceMatchMode: "fuzzy" })).toBe(true);
  });

  it("fuzzy acepta tildes y un typo en frases", () => {
    expect(
      matchPlayerAnswer("habitacion", "habitación", {
        normalize: "lowercase",
        voiceMatchMode: "fuzzy",
      }),
    ).toBe(true);
    expect(
      matchPlayerAnswer("luegoo", "luego", { normalize: "lowercase", voiceMatchMode: "fuzzy" }),
    ).toBe(true);
  });

  it("fuzzy no acepta palabras muy cortas distintas", () => {
    expect(
      matchPlayerAnswer("no", "si", { normalize: "lowercase", voiceMatchMode: "fuzzy" }),
    ).toBe(false);
  });

  it("digits convierte números hablados", () => {
    expect(spanishSpokenToDigits("uno dos tres cuatro")).toBe("1234");
    expect(
      matchPlayerAnswer("uno dos", "12", { voiceMatchMode: "digits", normalize: "trim" }),
    ).toBe(true);
  });

  it("sinónimos de cámara (exact)", () => {
    expect(
      matchPlayerAnswer("plato", "TAZA", {
        normalize: "uppercase",
        synonyms: ["TAZÓN", "PLATO"],
      }),
    ).toBe(true);
    expect(
      matchPlayerAnswer("vaso", "TAZA", {
        normalize: "uppercase",
        synonyms: ["PLATO"],
      }),
    ).toBe(false);
  });
});
