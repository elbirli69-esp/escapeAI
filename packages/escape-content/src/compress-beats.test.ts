import { describe, expect, it } from "vitest";
import {
  activateCompressNarrative,
  applyAction,
  createSession,
  type PlayerContext,
} from "@escapeai/escape-engine";
import { generateAdventureRoom } from "./generate-adventure.js";

const eventCtx: PlayerContext = {
  displayName: "Eq",
  eventId: "e",
  playerId: "p",
  joinCode: "AB12CD",
  slot: 1,
  adventureType: "team",
};

describe("compress narrative beats (generated)", () => {
  it("usa beats compress al entrar en middle con modo activo", () => {
    const room = generateAdventureRoom(
      {
        adventureType: "team",
        teamCount: 2,
        subject: { name: "Test" },
        facts: ["dato"],
      },
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    );
    const session = createSession(room, eventCtx);
    activateCompressNarrative(session, "team");

    applyAction(session, { type: "complete_interaction", puzzleId: "sound_intro", step: "listen" });
    applyAction(session, {
      type: "submit_answer",
      puzzleId: "sound_intro",
      value: room.puzzles.sound_intro!.answer!,
    });
    applyAction(session, {
      type: "submit_answer",
      puzzleId: "entry_lock",
      value: room.puzzles.entry_lock!.answer!,
    });
    applyAction(session, { type: "move", sceneId: "middle" });

    expect(session.firedBeats.has("gen-compress-middle")).toBe(true);
    expect(session.narrative.some((l) => l.includes("Checkpoint") || l.includes("cámara"))).toBe(true);
  });

  it("sin modo compress dispara beat finale default", () => {
    const room = generateAdventureRoom(
      {
        adventureType: "birthday",
        teamCount: 2,
        subject: { name: "Ada" },
        facts: ["dato"],
      },
      "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    );
    const session = createSession(room, eventCtx);
    winPathToFinale(session, room);
    applyAction(session, { type: "move", sceneId: "finale" });
    expect(session.firedBeats.has("gen-finale")).toBe(true);
    expect(session.firedBeats.has("gen-compress-finale")).toBe(false);
  });

  it("en modo compress no dispara gen-finale default", () => {
    const room = generateAdventureRoom(
      {
        adventureType: "birthday",
        teamCount: 2,
        subject: { name: "Ada" },
        facts: ["dato"],
      },
      "cccccccc-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    );
    const session = createSession(room, eventCtx);
    activateCompressNarrative(session, "birthday");
    winPathToFinale(session, room);
    applyAction(session, { type: "move", sceneId: "finale" });
    expect(session.firedBeats.has("gen-compress-finale")).toBe(true);
    expect(session.firedBeats.has("gen-finale")).toBe(false);
  });
});

function winPathToFinale(
  session: ReturnType<typeof createSession>,
  room: ReturnType<typeof generateAdventureRoom>,
): void {
  applyAction(session, { type: "complete_interaction", puzzleId: "sound_intro", step: "listen" });
  applyAction(session, {
    type: "submit_answer",
    puzzleId: "sound_intro",
    value: room.puzzles.sound_intro!.answer!,
  });
  applyAction(session, {
    type: "submit_answer",
    puzzleId: "entry_lock",
    value: room.puzzles.entry_lock!.answer!,
  });
  applyAction(session, { type: "move", sceneId: "middle" });
  applyAction(session, { type: "complete_interaction", puzzleId: "camera_hunt", step: "capture" });
  applyAction(session, {
    type: "submit_answer",
    puzzleId: "camera_hunt",
    value: room.puzzles.camera_hunt!.answer!,
  });
  applyAction(session, { type: "take_item", itemId: "token" });
  applyAction(session, { type: "use_item", itemId: "token", puzzleId: "token_slot" });
}