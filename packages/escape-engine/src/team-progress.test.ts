import { describe, expect, it } from "vitest";
import { createSession, getExitAvailability, parseRoomDefinition } from "./index.js";

const yaml = `
id: team_prog
name: Demo
timeLimitSec: 600
startSceneId: a
winCondition: { type: puzzle_solved, puzzleId: x }
items: {}
scenes:
  a:
    id: a
    title: A
    description: d
    puzzles: []
    exits:
      - toSceneId: b
        label: Ir
        when: { type: team_progress_gte, min: 2 }
  b:
    id: b
    title: B
    description: fin
    puzzles: []
    exits: []
puzzles:
  x:
    id: x
    type: code
    prompt: x
    answer: "1"
`;

describe("team_progress_gte", () => {
  it("bloquea salida hasta progreso comunitario", () => {
    const room = parseRoomDefinition(yaml);
    const s = createSession(room);
    expect(getExitAvailability(s)[0]?.available).toBe(false);
    s.teamProgress = { label: "L", value: 2, goal: 2 };
    expect(getExitAvailability(s)[0]?.available).toBe(true);
  });
});
