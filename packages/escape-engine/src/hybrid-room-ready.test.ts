import { describe, expect, it } from "vitest";
import { applyAction, createSession, parseRoomDefinition } from "./index.js";

const roomYaml = `
id: hybrid
name: Hybrid
timeLimitSec: 600
startSceneId: s
winCondition: { type: puzzle_solved, puzzleId: cam }
scenes:
  s:
    id: s
    title: S
    description: d
    puzzles: [cam]
puzzles:
  cam:
    id: cam
    type: camera
    prompt: Escribe OK
    answer: OK
    interactionHints:
      - "En la sala: coloca el cartel."
      - "En el móvil: haz la foto."
`;

describe("P5 room_ready", () => {
  it("bloquea submit hasta confirmar sala y capturar", () => {
    const session = createSession(parseRoomDefinition(roomYaml));
    const bad = applyAction(session, { type: "submit_answer", puzzleId: "cam", value: "OK" });
    expect(bad.ok).toBe(false);

    applyAction(session, { type: "complete_interaction", puzzleId: "cam", step: "room_ready" });
    const still = applyAction(session, { type: "submit_answer", puzzleId: "cam", value: "OK" });
    expect(still.ok).toBe(false);

    applyAction(session, { type: "complete_interaction", puzzleId: "cam", step: "capture" });
    const ok = applyAction(session, { type: "submit_answer", puzzleId: "cam", value: "OK" });
    expect(ok.ok).toBe(true);
  });
});