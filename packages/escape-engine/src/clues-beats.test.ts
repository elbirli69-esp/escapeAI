import { describe, expect, it } from "vitest";
import {
  applyAction,
  createSession,
  getExitAvailability,
  parseRoomDefinition,
  sessionHasClue,
} from "./index.js";

const roomYaml = `
id: clue_demo
name: Demo
timeLimitSec: 600
startSceneId: s
winCondition: { type: has_clue, clueId: year_note }
beats:
  - id: open
    after: session_started
    text: "Beat de apertura."
  - id: after_lock
    after: puzzle_solved
    puzzleId: lock
    text: "Beat tras candado."
items: {}
scenes:
  s:
    id: s
    title: Sala
    description: d
    puzzles: [lock]
    exits:
      - toSceneId: f
        label: Ir
        when: { type: has_clue, clueId: year_note }
  f:
    id: f
    title: Fin
    description: fin
    puzzles: []
    exits: []
puzzles:
  lock:
    id: lock
    type: code
    prompt: lock
    answer: "12"
    onSolve:
      grantClue:
        id: year_note
        text: "Tienes las dos cifras del prefijo."
`;

describe("clue ledger and beats", () => {
  it("grants clue and opens exit with has_clue", () => {
    const room = parseRoomDefinition(roomYaml);
    const session = createSession(room);
    expect(session.narrative.some((l) => l.includes("Beat de apertura"))).toBe(true);

    expect(getExitAvailability(session)[0]?.available).toBe(false);
    const locked = applyAction(session, { type: "move", sceneId: "f" });
    expect(locked.ok).toBe(false);

    expect(applyAction(session, { type: "submit_answer", puzzleId: "lock", value: "12" }).ok).toBe(true);
    expect(sessionHasClue(session, "year_note")).toBe(true);
    expect(session.narrative.some((l) => l.includes("prefijo"))).toBe(true);
    expect(session.narrative.some((l) => l.includes("Beat tras candado"))).toBe(true);

    const move = applyAction(session, { type: "move", sceneId: "f" });
    expect(move.ok).toBe(true);
    expect(move.state.clueNotes?.some((c) => c.id === "year_note")).toBe(true);
    expect(move.state.status).toBe("won");
  });
});
