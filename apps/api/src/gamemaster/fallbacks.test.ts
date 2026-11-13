import { describe, expect, it } from "vitest";
import { createSession, parseRoomDefinition } from "@escapeai/escape-engine";
import type { PlayerContext } from "@escapeai/escape-engine";
import { staticInterventionText } from "./fallbacks.js";

const miniRoom = parseRoomDefinition(`
id: mini
name: Sala test
tagline: Una prueba breve.
theme: urban
timeLimitSec: 600
startSceneId: s
winCondition: { type: puzzle_solved, puzzleId: p1 }
scenes:
  s:
    id: s
    title: Inicio
    description: d
    puzzles: [p1]
puzzles:
  p1:
    id: p1
    type: code
    prompt: x
    answer: "1"
`);

describe("staticInterventionText GAME_WON", () => {
  it("menciona evento y tipo mystery en payoff", () => {
    const ctx: PlayerContext = {
      displayName: "Equipo Alfa",
      eventTitle: "Retiro Costa 2026",
      adventureType: "mystery",
      joinCode: "ABC1",
      eventId: "e1",
      playerId: "p1",
      slot: 1,
    };
    const session = createSession(miniRoom, ctx);
    const { text } = staticInterventionText(session, {
      type: "GAME_WON",
      sourceEventId: "ev-win",
      payload: {},
    });
    expect(text).toContain("Retiro Costa 2026");
    expect(text).toContain("informe");
    expect(text).toContain("Equipo Alfa");
    expect(text).toContain("Una prueba breve");
  });
});
