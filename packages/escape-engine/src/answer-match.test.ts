import { describe, expect, it } from "vitest";
import { applyAction, createSession, parseRoomDefinition } from "./index.js";
import { matchPlayerAnswer, spanishSpokenToDigits } from "@escapeai/shared";

describe("matchPlayerAnswer", () => {
  it("fuzzy acepta tildes y un typo", () => {
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

  it("digits convierte números hablados en español", () => {
    expect(spanishSpokenToDigits("uno dos tres cuatro")).toBe("1234");
  });

  it("sinónimos de cámara", () => {
    expect(
      matchPlayerAnswer("plato", "TAZA", {
        normalize: "uppercase",
        synonyms: ["TAZÓN", "PLATO"],
      }),
    ).toBe(true);
  });
});

describe("voice puzzle fuzzy en sesión", () => {
  const roomYaml = `
id: t
name: T
timeLimitSec: 600
startSceneId: s
winCondition: { type: puzzle_solved, puzzleId: v1 }
items: {}
scenes:
  s:
    id: s
    title: S
    description: d
    puzzles: [v1]
puzzles:
  v1:
    id: v1
    type: voice
    prompt: di luego
    answer: luego
    normalize: lowercase
    voiceMatchMode: fuzzy
    voiceLocale: es-ES
`;
  it("acepta respuesta con fuzzy tras complete speak", () => {
    const session = createSession(parseRoomDefinition(roomYaml));
    applyAction(session, { type: "complete_interaction", puzzleId: "v1", step: "speak" });
    const res = applyAction(session, {
      type: "submit_answer",
      puzzleId: "v1",
      value: "luegoo",
    });
    expect(res.ok).toBe(true);
    expect(res.state.puzzles[0]?.solved).toBe(true);
  });
});
