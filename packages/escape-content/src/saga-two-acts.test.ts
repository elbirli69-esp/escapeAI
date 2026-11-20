import { describe, expect, it } from "vitest";
import { applyAction, createSession } from "@escapeai/escape-engine";
import { generateAdventureRoom } from "./generate-adventure.js";

const eventId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

const sagaInput = {
  adventureType: "birthday" as const,
  teamCount: 2,
  subject: { name: "Marta López", nickname: "Marta" },
  facts: ["Le gusta el jazz", "Nació en 1990"],
  hybridPlayMode: "mobile_only" as const,
  sagaTwoActs: true,
};

function playToFinale(session: ReturnType<typeof createSession>, room: ReturnType<typeof generateAdventureRoom>) {
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
  applyAction(session, { type: "take_item", itemId: "token" });
  applyAction(session, { type: "use_item", itemId: "token", puzzleId: "token_slot" });
  applyAction(session, { type: "move", sceneId: "finale" });
}

describe("P6-D saga dos actos", () => {
  it("tras acto 1 no hay victoria hasta el rescate", () => {
    const room = generateAdventureRoom(sagaInput, eventId);
    expect(room.sagaTwoActs).toBe(true);
    expect(room.winCondition).toEqual({ type: "puzzle_solved", puzzleId: "saga_rescue_code" });
    expect(room.scenes.finale_b?.puzzles).toEqual(["saga_rescue_code"]);

    const session = createSession(room);
    playToFinale(session, room);

    const act1 = applyAction(session, {
      type: "submit_answer",
      puzzleId: "final_code",
      value: room.puzzles.final_code!.answer!,
    });
    expect(act1.ok).toBe(true);
    expect(session.status).toBe("playing");

    const blocked = applyAction(session, { type: "move", sceneId: "finale_b" });
    expect(blocked.ok).toBe(false);

    session.sagaAct2Released = true;
    const enter = applyAction(session, { type: "move", sceneId: "finale_b" });
    expect(enter.ok).toBe(true);

    const rescueLetters = room.puzzles.saga_rescue_code!.answer!;
    const win = applyAction(session, {
      type: "submit_answer",
      puzzleId: "saga_rescue_code",
      value: rescueLetters,
    });
    expect(win.ok).toBe(true);
    expect(session.status).toBe("won");
  });
});