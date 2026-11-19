import { describe, expect, it } from "vitest";
import { applyAction, createSession, sessionHasClue } from "@escapeai/escape-engine";
import { generateAdventureRoom } from "./generate-adventure.js";
import { pickWhodunitCulprit } from "./whodunit.js";

const eventId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

const base = {
  adventureType: "mystery" as const,
  teamCount: 2,
  subject: { name: "Caso Faro", nickname: "Luz" },
  facts: ["Sospechoso en el muelle", "Hora 23:00", "Llave perdida"],
};

describe("P6-A whodunit mystery", () => {
  it("mystery incluye case_accusation y winCondition", () => {
    const room = generateAdventureRoom(base, eventId);
    expect(room.puzzles.case_accusation?.type).toBe("deduction");
    expect(room.winCondition).toEqual({ type: "puzzle_solved", puzzleId: "case_accusation" });
    expect(room.puzzles.case_accusation?.answer).toBe(pickWhodunitCulprit(eventId));
  });

  it("acusación correcta gana tras clues requeridas", () => {
    const room = generateAdventureRoom(base, eventId);
    const session = createSession(room);
    const culprit = pickWhodunitCulprit(eventId);

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

    expect(sessionHasClue(session, "suspect_conserje_keys")).toBe(true);
    expect(sessionHasClue(session, "suspect_vecina_window")).toBe(true);
    expect(sessionHasClue(session, "suspect_testigo_call")).toBe(true);

    const win = applyAction(session, {
      type: "submit_answer",
      puzzleId: "case_accusation",
      value: culprit,
    });
    expect(win.ok).toBe(true);
    expect(win.state.status).toBe("won");
  });
});