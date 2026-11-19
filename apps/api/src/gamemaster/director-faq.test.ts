import { describe, expect, it } from "vitest";
import { generateAdventureRoom } from "@escapeai/escape-content";
import { applyAction, createSession } from "@escapeai/escape-engine";
import type { CreateEventRequest } from "@escapeai/shared";
import { MemoryGmInterventionStore, GameMasterService } from "./index.js";
import { snapshotExits } from "./index.js";

const room = generateAdventureRoom(
  {
    adventureType: "birthday",
    teamCount: 2,
    subject: { name: "Test", nickname: "T" },
    facts: ["Fact"],
    eventTitle: "E",
  } as CreateEventRequest,
  "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
);

describe("DIRECTOR_FAQ", () => {
  it("crea intervención estática al pedir chip", async () => {
    const session = createSession(room);
    const gm = new GameMasterService(new MemoryGmInterventionStore());
    await gm.processSessionStarted(session);
    const beforeExits = snapshotExits(session);
    const result = applyAction(session, { type: "director_faq", faqId: "should_request_hint" });
    expect(result.ok).toBe(true);
    const created = await gm.processAfterAction({
      session,
      action: { type: "director_faq", faqId: "should_request_hint" },
      events: result.events,
      beforeExits,
    });
    expect(created.length).toBeGreaterThanOrEqual(1);
    expect(created[0]!.text).toMatch(/Pedir pista|pista/i);
    expect(created[0]!.kind).toBe("notification");
  });
});