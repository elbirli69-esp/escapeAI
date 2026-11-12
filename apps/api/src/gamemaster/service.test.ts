import { describe, expect, it } from "vitest";
import { generateAdventureRoom } from "@escapeai/escape-content";
import { applyAction, createSession, getExitAvailability } from "@escapeai/escape-engine";
import { MemoryGmInterventionStore, GameMasterService } from "./index.js";

describe("GameMasterService", () => {
  const saraEvent = {
    adventureType: "birthday" as const,
    teamCount: 5,
    durationMin: 60 as const,
    subject: { name: "Sara García", nickname: "Sara", age: 30 },
    facts: ["Le encanta la playa", "Canción LUEGO", "Año clave 1995"],
    eventTitle: "Misterio de Sara",
  };

  it("inicio de sesión genera intervención GM sin tocar narrative", async () => {
    const room = generateAdventureRoom(saraEvent, "aaaaaaaa-bbbb-cccc-dddd-111111111111");
    const session = createSession(room, {
      displayName: "Equipo Rojo",
      eventId: "ev",
      playerId: "t1",
      joinCode: "ABC123",
      slot: 1,
      eventTitle: room.name,
      adventureType: "birthday",
    });
    const narrativeBefore = session.narrative.length;
    const store = new MemoryGmInterventionStore();
    const gm = new GameMasterService(store);

    const interventions = await gm.processSessionStarted(session);
    expect(interventions.length).toBeGreaterThan(0);
    expect(session.narrative.length).toBe(narrativeBefore);

    const blob = JSON.stringify(interventions[0]);
    expect(blob).not.toContain("1995");
  });

  it("hint_requested genera intervención HINT_GRANTED con clueRefs", async () => {
    const room = loadRoomHelper();
    const session = createSession(room);
    const store = new MemoryGmInterventionStore();
    const gm = new GameMasterService(store);
    const before = getExitAvailability(session);
    const result = applyAction(session, { type: "request_hint", puzzleId: "entry_lock" });
    expect(result.ok).toBe(true);
    const created = await gm.processAfterAction({
      session,
      action: { type: "request_hint", puzzleId: "entry_lock" },
      events: result.events,
      beforeExits: before,
    });
    expect(created.length).toBe(1);
    expect(created[0].kind).toBe("hint");
    expect(created[0].clueRefs?.[0]?.puzzleId).toBe("entry_lock");
    const answer = room.puzzles.entry_lock?.answer;
    if (answer) {
      expect(created[0].text.toLowerCase()).not.toContain(answer.toLowerCase());
    }
  });

  it("puzzle resuelto persiste intervención estática", async () => {
    const room = loadRoomHelper();
    const session = createSession(room);
    const store = new MemoryGmInterventionStore();
    const gm = new GameMasterService(store);
    const before = getExitAvailability(session);
    await gm.processSessionStarted(session);
    const listen = applyAction(session, {
      type: "complete_interaction",
      puzzleId: "sound_intro",
      step: "listen",
    });
    expect(listen.ok).toBe(true);
    const result = applyAction(session, {
      type: "submit_answer",
      puzzleId: "sound_intro",
      value: room.puzzles.sound_intro.answer!,
    });
    const created = await gm.processAfterAction({
      session,
      action: { type: "submit_answer", puzzleId: "sound_intro", value: room.puzzles.sound_intro.answer! },
      events: result.events,
      beforeExits: before,
    });
    expect(result.events.some((e) => e.type === "puzzle_solved")).toBe(true);
    expect(created.some((i) => i.meta.provider === "static")).toBe(true);
  });
});

function loadRoomHelper() {
  return generateAdventureRoom(
    {
      adventureType: "birthday",
      teamCount: 2,
      durationMin: 45,
      subject: { name: "Test" },
      facts: ["fact A", "2018 year"],
    },
    "cccccccc-cccc-cccc-cccc-cccccccccccc",
  );
}
