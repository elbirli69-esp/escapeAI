import { describe, expect, it } from "vitest";
import {
  activateCompressNarrative,
  applyAction,
  createSession,
  effectiveHintCap,
  grantBonusHintLevel,
  isCatalogSession,
  maybeCatalogFailForward,
  maybeGeneratedFailForward,
  parseRoomDefinition,
} from "./index.js";
import type { PlayerContext } from "./player-context.js";

const eventCtx: PlayerContext = {
  displayName: "Equipo",
  eventId: "ev",
  playerId: "p",
  joinCode: "JOIN01",
  slot: 1,
  adventureType: "birthday",
};

const generatedMini = parseRoomDefinition(`
id: generated-test01
name: Evento test
theme: urban
timeLimitSec: 600
startSceneId: start
winCondition: { type: puzzle_solved, puzzleId: entry_lock }
scenes:
  start:
    id: start
    title: Inicio
    description: d
    puzzles: [sound_intro, entry_lock]
puzzles:
  sound_intro:
    id: sound_intro
    type: sound
    prompt: oir
    answer: "12"
    label: Audio
  entry_lock:
    id: entry_lock
    type: code
    prompt: lock
    answer: "1995"
    label: Candado
    maxHints: 1
    hints:
      - { level: 1, text: pista uno }
      - { level: 2, text: pista dos }
`);

describe("adaptive-assist", () => {
  it("fail-forward unlocks sound_intro listen after entry_lock fails", () => {
    const session = createSession(generatedMini, eventCtx);
    for (let i = 0; i < 4; i++) {
      applyAction(session, {
        type: "submit_answer",
        puzzleId: "entry_lock",
        value: "wrong",
      });
    }
    expect(session.failForwardSoundIntro).toBe(true);
    const listen = applyAction(session, {
      type: "submit_answer",
      puzzleId: "sound_intro",
      value: "12",
    });
    expect(listen.ok).toBe(true);
  });

  it("bonus hint level raises effective cap", () => {
    const session = createSession(generatedMini, eventCtx);
    grantBonusHintLevel(session, "entry_lock", 1);
    expect(effectiveHintCap(session, "entry_lock", 2, 1)).toBe(2);
    const hint = applyAction(session, { type: "request_hint", puzzleId: "entry_lock" });
    expect(hint.ok).toBe(true);
    const hint2 = applyAction(session, { type: "request_hint", puzzleId: "entry_lock" });
    expect(hint2.ok).toBe(true);
  });

  it("maybeGeneratedFailForward no-op without join code", () => {
    const session = createSession(generatedMini);
    session.puzzleAttempts.set("entry_lock", 10);
    expect(maybeGeneratedFailForward(session, "entry_lock")).toBe(false);
  });

  it("catalog: fail-forward desbloquea intercom tras lockbox", () => {
    const pilotMini = parseRoomDefinition(`
id: pilot
name: Pilot
theme: urban
timeLimitSec: 600
startSceneId: entrance
winCondition: { type: puzzle_solved, puzzleId: lockbox }
scenes:
  entrance:
    id: entrance
    title: Entrada
    description: d
    puzzles: [intercom_tone, lockbox]
puzzles:
  intercom_tone:
    id: intercom_tone
    type: sound
    prompt: oir
    answer: "1"
    label: Timbre
  lockbox:
    id: lockbox
    type: code
    prompt: lock
    answer: "1984"
    label: Candado
    maxHints: 3
    hints:
      - { level: 1, text: p1 }
      - { level: 2, text: p2 }
      - { level: 3, text: p3 }
`);
    const session = createSession(pilotMini);
    expect(isCatalogSession(session)).toBe(true);
    for (let i = 0; i < 3; i++) {
      applyAction(session, {
        type: "submit_answer",
        puzzleId: "lockbox",
        value: "0000",
      });
    }
    expect(session.puzzleInteractions.get("intercom_tone")?.has("listen")).toBe(true);
    expect(maybeCatalogFailForward(session, "lockbox")).toBe(false);
  });

  it("grantBonusHintLevel en catálogo", () => {
    const session = createSession(
      parseRoomDefinition(`
id: pilot
name: Pilot
theme: urban
timeLimitSec: 600
startSceneId: s
winCondition: { type: puzzle_solved, puzzleId: p1 }
scenes:
  s:
    id: s
    title: S
    description: d
    puzzles: [p1]
puzzles:
  p1:
    id: p1
    type: code
    prompt: x
    answer: "1"
    maxHints: 2
    hints:
      - { level: 1, text: h1 }
      - { level: 2, text: h2 }
`),
    );
    grantBonusHintLevel(session, "p1", 1);
    expect(effectiveHintCap(session, "p1", 2, 2)).toBe(2);
  });

  it("activateCompressNarrative es idempotente en eventos generados", () => {
    const session = createSession(generatedMini, eventCtx);
    expect(activateCompressNarrative(session, "birthday")).toBe(true);
    expect(session.assistNarrativeMode).toBe("compress");
    expect(activateCompressNarrative(session, "birthday")).toBe(false);
  });
});