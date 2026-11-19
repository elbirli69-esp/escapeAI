import { describe, expect, it } from "vitest";
import { applyAction, createSession, sessionHasClue } from "@escapeai/escape-engine";
import { generateAdventureRoom } from "./generate-adventure.js";

const eventId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

describe("P5 acto 2 híbrido (generado)", () => {
  it("cámara → clue → take token → token_slot", () => {
    const room = generateAdventureRoom(
      {
        adventureType: "birthday",
        teamCount: 2,
        subject: { name: "Ada", nickname: "Ada" },
        facts: ["Nació en 1815"],
      },
      eventId,
    );
    const session = createSession(room);

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

    const blocked = applyAction(session, { type: "take_item", itemId: "token" });
    expect(blocked.ok).toBe(false);

    applyAction(session, { type: "complete_interaction", puzzleId: "camera_hunt", step: "room_ready" });
    applyAction(session, { type: "complete_interaction", puzzleId: "camera_hunt", step: "capture" });
    const cam = applyAction(session, {
      type: "submit_answer",
      puzzleId: "camera_hunt",
      value: room.puzzles.camera_hunt!.answer!,
    });
    expect(cam.ok).toBe(true);
    expect(sessionHasClue(session, "salon_photo_ok")).toBe(true);

    expect(applyAction(session, { type: "take_item", itemId: "token" }).ok).toBe(true);
    expect(
      applyAction(session, { type: "use_item", itemId: "token", puzzleId: "token_slot" }).ok,
    ).toBe(true);
  });

  it("mobile_only permite take_item sin cámara", () => {
    const room = generateAdventureRoom(
      {
        adventureType: "birthday",
        teamCount: 2,
        subject: { name: "Ada", nickname: "Ada" },
        facts: ["Nació en 1815"],
        hybridPlayMode: "mobile_only",
      },
      eventId,
    );
    const session = createSession(room);
    applyAction(session, { type: "complete_interaction", puzzleId: "sound_intro", step: "listen" });
    applyAction(session, { type: "submit_answer", puzzleId: "sound_intro", value: room.puzzles.sound_intro!.answer! });
    applyAction(session, { type: "submit_answer", puzzleId: "entry_lock", value: room.puzzles.entry_lock!.answer! });
    applyAction(session, { type: "move", sceneId: "middle" });
    expect(applyAction(session, { type: "take_item", itemId: "token" }).ok).toBe(true);
  });
});