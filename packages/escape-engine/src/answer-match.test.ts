import { describe, expect, it } from "vitest";
import { applyAction, createSession, parseRoomDefinition } from "./index.js";
import { matchPlayerAnswer } from "@escapeai/shared";

describe("motor con matchPlayerAnswer", () => {
  it("códigos numéricos sound rechazan fuzzy", () => {
    expect(
      matchPlayerAnswer("4", "3", { normalize: "trim", voiceMatchMode: "exact" }),
    ).toBe(false);
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
  it("rechaza respuesta vacía tras speak", () => {
    const session = createSession(parseRoomDefinition(roomYaml));
    applyAction(session, { type: "complete_interaction", puzzleId: "v1", step: "speak" });
    const res = applyAction(session, {
      type: "submit_answer",
      puzzleId: "v1",
      value: "   ",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/respuesta/i);
  });

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
