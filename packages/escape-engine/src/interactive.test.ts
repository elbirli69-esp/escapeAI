import { describe, expect, it } from "vitest";
import { applyAction, createSession, parseRoomDefinition } from "./index.js";

const roomYaml = `
id: mini
name: Mini
timeLimitSec: 600
startSceneId: s1
winCondition:
  type: puzzle_solved
  puzzleId: p1
scenes:
  s1:
    id: s1
    title: S
    description: d
    puzzles: [p1]
puzzles:
  p1:
    id: p1
    type: sound
    prompt: listen
    audioUrl: https://example.com/a.mp3
    answer: "42"
`;

describe("interactive puzzles", () => {
  it("requires listen before answer", () => {
    const room = parseRoomDefinition(roomYaml);
    const session = createSession(room);
    const fail = applyAction(session, {
      type: "submit_answer",
      puzzleId: "p1",
      value: "42",
    });
    expect(fail.ok).toBe(false);
    applyAction(session, { type: "complete_interaction", puzzleId: "p1", step: "listen" });
    const ok = applyAction(session, {
      type: "submit_answer",
      puzzleId: "p1",
      value: "42",
    });
    expect(ok.ok).toBe(true);
    expect(ok.state.status).toBe("won");
  });
});
