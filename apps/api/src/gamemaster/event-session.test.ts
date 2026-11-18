import { describe, expect, it } from "vitest";
import { createSession, parseRoomDefinition } from "@escapeai/escape-engine";
import type { PlayerContext } from "@escapeai/escape-engine";
import {
  eventPaceNudgeCopy,
  eventTeamStuckCopy,
  isEventSession,
  maybeGrantBonusHintFromGm,
} from "./event-session.js";
import type { GmSessionMeta } from "./persistence.js";
import { staticInterventionText } from "./fallbacks.js";

const miniRoom = parseRoomDefinition(`
id: mini
name: Sala test
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

const eventCtx: PlayerContext = {
  displayName: "Equipo Rojo",
  eventId: "ev1",
  playerId: "p1",
  joinCode: "JOIN99",
  slot: 1,
  eventTitle: "Retiro 2026",
  adventureType: "mystery",
};

describe("isEventSession", () => {
  it("detecta joinCode", () => {
    expect(isEventSession(createSession(miniRoom, eventCtx))).toBe(true);
    expect(isEventSession(createSession(miniRoom))).toBe(false);
  });
});

describe("event adaptive fallbacks", () => {
  it("PACE_NUDGE mystery en evento usa copy de investigación", () => {
    const session = createSession(miniRoom, eventCtx);
    const { text } = staticInterventionText(session, {
      type: "PACE_NUDGE",
      sourceEventId: "x",
      payload: { pacingMode: "behind" },
    });
    expect(text).toMatch(/investigación|cuaderno|candado/i);
    expect(text).not.toContain("Priorizad un puzzle abierto.");
  });

  it("TEAM_STUCK ambient en evento no repite copy estándar", () => {
    const session = createSession(miniRoom, eventCtx);
    session.grantedClues.set("clue_a", "prefijo 19");
    const { text } = staticInterventionText(session, {
      type: "TEAM_STUCK",
      sourceEventId: "x",
      payload: { puzzleId: "p1", assistTier: "ambient" },
    });
    expect(text).toMatch(/cuaderno|ruido|detalle/i);
    expect(eventTeamStuckCopy("Candado", "mystery", "ambient")).toMatch(/cuaderno/i);
  });

  it("SESSION_STARTED en evento menciona cuaderno", () => {
    const session = createSession(miniRoom, { ...eventCtx, adventureType: "team" });
    const { text } = staticInterventionText(session, {
      type: "SESSION_STARTED",
      sourceEventId: "x",
    });
    expect(text).toMatch(/Retiro 2026|competís|cuaderno/i);
  });

  it("eventPaceNudgeCopy critical team", () => {
    expect(eventPaceNudgeCopy("critical", "team")).toMatch(/equipos|ranking|puzzle/i);
  });

  it("maybeGrantBonusHintFromGm en catálogo pilot", async () => {
    const { loadRoomById } = await import("@escapeai/escape-content");
    const session = createSession(loadRoomById("pilot"));
    const meta = {
      sequence: 0,
      dedupeKeys: [],
      llmCallCount: 0,
      lastLlmCallMs: 0,
      visitedSceneIds: [],
      lastProgressMs: Date.now(),
      stuckNotifiedPuzzleIds: [],
      characterTurnCount: 0,
      lastCharacterTurnMs: 0,
      paceNudgeIssued: false,
      stuckAmbientIssuedPuzzleIds: [],
      aheadFlavorIssued: false,
      bonusHintGrantedPuzzleIds: [],
      catalogFailNudgePuzzleIds: [],
    };
    const next = maybeGrantBonusHintFromGm(session, meta, "lockbox");
    expect(next.bonusHintGrantedPuzzleIds).toContain("lockbox");
    expect(session.bonusHintLevels.get("lockbox")).toBe(1);
  });

  it("maybeGrantBonusHintFromGm solo en sala generated con join", () => {
    const session = createSession(miniRoom, eventCtx);
    session.room = { ...session.room, id: "generated-abc12345" };
    const meta: GmSessionMeta = {
      sequence: 0,
      dedupeKeys: [],
      llmCallCount: 0,
      lastLlmCallMs: 0,
      visitedSceneIds: [],
      lastProgressMs: 0,
      stuckNotifiedPuzzleIds: [],
      characterTurnCount: 0,
      lastCharacterTurnMs: 0,
      paceNudgeIssued: false,
      stuckAmbientIssuedPuzzleIds: [],
      aheadFlavorIssued: false,
      bonusHintGrantedPuzzleIds: [],
      catalogFailNudgePuzzleIds: [],
    };
    const next = maybeGrantBonusHintFromGm(session, meta, "p1");
    expect(next.bonusHintGrantedPuzzleIds).toContain("p1");
    expect(session.bonusHintLevels.get("p1")).toBe(1);
  });
});