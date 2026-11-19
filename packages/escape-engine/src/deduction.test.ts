import { describe, expect, it } from "vitest";
import { applyAction, createSession, parseRoomDefinition } from "./index.js";

const yaml = `
id: ded
name: D
timeLimitSec: 600
startSceneId: s
winCondition: { type: puzzle_solved, puzzleId: acc }
scenes:
  s:
    id: s
    title: S
    description: d
    puzzles: [acc]
puzzles:
  acc:
    id: acc
    type: deduction
    prompt: Elige
    answer: vecina
    normalize: lowercase
    deduction:
      suspects:
        - id: vecina
          name: Vecina
          traits:
            - { id: t1, label: vio, clearingClueId: clue_a }
      requiredClueIds: [clue_a]
`;

describe("deduction puzzle", () => {
  it("rechaza sin clues requeridas", () => {
    const session = createSession(parseRoomDefinition(yaml));
    session.grantedClues.set("clue_a", "ok");
    const bad = applyAction(session, { type: "submit_answer", puzzleId: "acc", value: "conserje" });
    expect(bad.ok).toBe(true);
    expect(session.solvedPuzzles.has("acc")).toBe(false);

    const session2 = createSession(parseRoomDefinition(yaml));
    const blocked = applyAction(session2, { type: "submit_answer", puzzleId: "acc", value: "vecina" });
    expect(blocked.ok).toBe(false);
    expect(blocked.error).toMatch(/cuaderno/i);

    session2.grantedClues.set("clue_a", "x");
    const ok = applyAction(session2, { type: "submit_answer", puzzleId: "acc", value: "vecina" });
    expect(ok.ok).toBe(true);
  });
});