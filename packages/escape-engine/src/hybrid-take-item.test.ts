import { describe, expect, it } from "vitest";
import { applyAction, createSession, parseRoomDefinition } from "./index.js";

const roomYaml = `
id: hybrid_take
name: Híbrido
timeLimitSec: 600
startSceneId: m
winCondition: { type: puzzle_solved, puzzleId: slot }
items:
  token:
    name: Ficha
    description: Ficha física
    takeRequiresPuzzleSolved: cam
scenes:
  m:
    id: m
    title: Medio
    description: Sala
    items: [token]
    puzzles: [cam, slot]
puzzles:
  cam:
    id: cam
    type: code
    prompt: puzzle digital
    answer: "1"
  slot:
    id: slot
    type: inventory
    prompt: ranura
    requiresItem: token
`;

describe("takeRequiresPuzzleSolved (P5 híbrido)", () => {
  it("bloquea take_item hasta resolver el puzzle previo", () => {
    const room = parseRoomDefinition(roomYaml);
    const session = createSession(room);

    const early = applyAction(session, { type: "take_item", itemId: "token" });
    expect(early.ok).toBe(false);
    expect(early.error).toMatch(/prueba del móvil/i);

    expect(applyAction(session, { type: "submit_answer", puzzleId: "cam", value: "1" }).ok).toBe(true);

    const take = applyAction(session, { type: "take_item", itemId: "token" });
    expect(take.ok).toBe(true);
    expect(session.inventory.has("token")).toBe(true);
  });
});