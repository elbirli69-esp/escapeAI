import { describe, expect, it } from "vitest";
import { getPilotRoom } from "@escapeai/escape-content";
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
  });
});
