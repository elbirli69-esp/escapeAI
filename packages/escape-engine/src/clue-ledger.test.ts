import { describe, expect, it } from "vitest";
import { applyAction, createSession, parseRoomDefinition } from "./index.js";

const roomYaml = `
id: hint_demo
name: Demo
timeLimitSec: 600
startSceneId: s
winCondition: { type: puzzle_solved, puzzleId: lock }
items: {}
scenes:
  s:
    id: s
    title: Sala
    description: d
    puzzles: [lock]
    exits: []
puzzles:
  lock:
    id: lock
    type: code
    prompt: lock
    answer: "99"
    maxHints: 2
    hints:
      - level: 1
        text: Primer empujón.
      - level: 2
        text: Segundo empujón.
`;

describe("clueHistory", () => {
  it("incluye pistas consumidas y beat clues", () => {
    const session = createSession(parseRoomDefinition(roomYaml));
    applyAction(session, { type: "request_hint", puzzleId: "lock" });
    const afterHint = applyAction(session, { type: "request_hint", puzzleId: "lock" });
    expect(afterHint.state.clueHistory).toEqual([
      {
        id: "hint:lock:1",
        kind: "hint",
        puzzleId: "lock",
        hintLevel: 1,
        text: "Primer empujón.",
      },
      {
        id: "hint:lock:2",
        kind: "hint",
        puzzleId: "lock",
        hintLevel: 2,
        text: "Segundo empujón.",
      },
    ]);

    const solved = applyAction(session, { type: "submit_answer", puzzleId: "lock", value: "99" });
    expect(solved.state.clueHistory?.some((e) => e.kind === "hint")).toBe(true);
  });
});