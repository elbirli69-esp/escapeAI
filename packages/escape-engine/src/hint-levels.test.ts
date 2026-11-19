import { describe, expect, it } from "vitest";
import { applyAction, createSession, parseRoomDefinition } from "./index.js";

const roomYaml = `
id: hints
name: H
timeLimitSec: 600
startSceneId: s
winCondition: { type: puzzle_solved, puzzleId: p }
items: {}
scenes:
  s:
    id: s
    title: S
    description: d
    puzzles: [p]
    exits: []
puzzles:
  p:
    id: p
    type: code
    prompt: p
    answer: "1"
    maxHints: 3
    hints:
      - level: 1
        text: N1
      - level: 2
        text: N2
      - level: 3
        text: N3
`;

describe("hint levels (Caso J)", () => {
  it("request_hint secuencial incrementa puzzleHintsUsed", () => {
    const session = createSession(parseRoomDefinition(roomYaml));
    expect(applyAction(session, { type: "request_hint", puzzleId: "p" }).ok).toBe(true);
    expect(session.puzzleHintsUsed.get("p")).toBe(1);
    expect(applyAction(session, { type: "request_hint", puzzleId: "p" }).ok).toBe(true);
    expect(session.puzzleHintsUsed.get("p")).toBe(2);
    const third = applyAction(session, { type: "request_hint", puzzleId: "p" });
    expect(third.ok).toBe(true);
    expect(session.puzzleHintsUsed.get("p")).toBe(3);
    const fourth = applyAction(session, { type: "request_hint", puzzleId: "p" });
    expect(fourth.ok).toBe(false);
  });
});