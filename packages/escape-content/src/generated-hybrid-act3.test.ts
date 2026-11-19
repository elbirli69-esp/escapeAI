import { describe, expect, it } from "vitest";
import { applyAction, createSession, sessionHasClue } from "@escapeai/escape-engine";
import { generateAdventureRoom } from "./generate-adventure.js";

const eventId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function reachFinale() {
  const room = generateAdventureRoom(
    {
      adventureType: "team",
      teamCount: 2,
      subject: { name: "Ada Lovelace", nickname: "Ada" },
      facts: ["Nació en 1815"],
    },
    eventId,
  );
  const session = createSession(room);

  applyAction(session, { type: "complete_interaction", puzzleId: "sound_intro", step: "listen" });
  applyAction(session, { type: "submit_answer", puzzleId: "sound_intro", value: room.puzzles.sound_intro!.answer! });
  applyAction(session, { type: "submit_answer", puzzleId: "entry_lock", value: room.puzzles.entry_lock!.answer! });
  applyAction(session, { type: "move", sceneId: "middle" });
  applyAction(session, { type: "complete_interaction", puzzleId: "camera_hunt", step: "room_ready" });
  applyAction(session, { type: "complete_interaction", puzzleId: "camera_hunt", step: "capture" });
  applyAction(session, { type: "submit_answer", puzzleId: "camera_hunt", value: room.puzzles.camera_hunt!.answer! });
  applyAction(session, { type: "take_item", itemId: "token" });
  applyAction(session, { type: "use_item", itemId: "token", puzzleId: "token_slot" });
  applyAction(session, { type: "move", sceneId: "finale" });
  return { room, session };
}

describe("P5 acto 3 híbrido (generado)", () => {
  it("finale_poster concede poster_ok con hints sala/móvil", () => {
    const { room, session } = reachFinale();
    const poster = room.puzzles.finale_poster!;
    expect(poster.cameraMode).toBe("ocr_hint");
    expect(poster.interactionHints?.some((h) => h.startsWith("En la sala:"))).toBe(true);

    applyAction(session, { type: "complete_interaction", puzzleId: "finale_poster", step: "room_ready" });
    applyAction(session, { type: "complete_interaction", puzzleId: "finale_poster", step: "capture" });
    const solved = applyAction(session, {
      type: "submit_answer",
      puzzleId: "finale_poster",
      value: poster.answer!,
    });
    expect(solved.ok).toBe(true);
    expect(sessionHasClue(session, "poster_ok")).toBe(true);
  });
});