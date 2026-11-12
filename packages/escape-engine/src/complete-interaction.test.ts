import { describe, expect, it } from "vitest";
import { applyAction, createSession, parseRoomDefinition } from "./index.js";

const roomYaml = `
id: t
name: T
timeLimitSec: 600
startSceneId: s
winCondition: { type: puzzle_solved, puzzleId: p1 }
items: {}
scenes:
  s:
    id: s
    title: S
    description: d
    puzzles: [p1]
puzzles:
  p1:
    id: p1
    type: visual
    prompt: mira
    pexelsQuery: test
    answer: "1"
`;

describe("complete_interaction", () => {
  it("es idempotente y no repite narrativa", () => {
    const session = createSession(parseRoomDefinition(roomYaml));
    const a = applyAction(session, {
      type: "complete_interaction",
      puzzleId: "p1",
      step: "view",
    });
    const b = applyAction(session, {
      type: "complete_interaction",
      puzzleId: "p1",
      step: "view",
    });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    const viewLines = session.narrative.filter((n) => n.includes("estudiado"));
    expect(viewLines.length).toBe(1);
  });
});
