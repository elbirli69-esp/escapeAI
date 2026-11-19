import { describe, expect, it } from "vitest";
import { generateAdventureRoom, getPilotRoom } from "@escapeai/escape-content";
import type { CreateEventRequest } from "@escapeai/shared";
import { applyAction, createSession, getExitAvailability } from "@escapeai/escape-engine";
import { MemoryGmInterventionStore, GameMasterService } from "./index.js";

describe("CHARACTER_TURN", () => {
  it("genera intervención kind character", async () => {
    const session = createSession(getPilotRoom());
    const store = new MemoryGmInterventionStore();
    const gm = new GameMasterService(store);
    const before = getExitAvailability(session);
    const result = applyAction(session, {
      type: "talk_to_character",
      characterId: "night_concierge",
      message: "¿Qué dice el post-it?",
    });
    expect(result.ok).toBe(true);
    const created = await gm.processAfterAction({
      session,
      action: {
        type: "talk_to_character",
        characterId: "night_concierge",
        message: "¿Qué dice el post-it?",
      },
      events: result.events,
      beforeExits: before,
    });
    expect(created.length).toBe(1);
    expect(created[0].kind).toBe("character");
    expect(created[0].characterId).toBe("night_concierge");
    expect(created[0].text.toLowerCase()).not.toContain("1984");
    expect(created[0].presentation).toBe("tts");
  });

  it("NPC en evento mystery generado sin revelar candado", async () => {
    const room = generateAdventureRoom(
      {
        adventureType: "mystery",
        teamCount: 2,
        subject: { name: "Ada", nickname: "Ada" },
        facts: ["Nació en 1815", "Le gustan los puzzles costeros"],
        eventTitle: "Caso prueba",
      } as CreateEventRequest,
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    );
    const session = createSession(room);
    const gm = new GameMasterService(new MemoryGmInterventionStore());
    const before = getExitAvailability(session);
    const result = applyAction(session, {
      type: "talk_to_character",
      characterId: "event_guide",
      message: "¿Cuál es el candado?",
    });
    expect(result.ok).toBe(true);
    const created = await gm.processAfterAction({
      session,
      action: {
        type: "talk_to_character",
        characterId: "event_guide",
        message: "¿Cuál es el candado?",
      },
      events: result.events,
      beforeExits: before,
    });
    expect(created.length).toBe(1);
    expect(created[0]!.text).not.toMatch(/1815/);
    expect(created[0]!.characterId).toBe("event_guide");
  });
});
